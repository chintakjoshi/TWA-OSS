from __future__ import annotations

import tempfile
import uuid
import zipfile
from collections.abc import Generator
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.session import get_db_session
from app.main import create_app
from app.models import AppUser, AuditLog, JobListing
from app.models.enums import AppRole
from app.services.auth import AuthProviderIdentity, get_auth_provider_identity
from app.services.geocoding import GeocodeResult, geocode_address
from app.services.transit import (
    TransitComputationResult,
    compute_transit_accessibility,
    load_gtfs_stops,
    zip_to_job_distance_miles,
)


@pytest.fixture()
def gtfs_feed_path() -> Generator[Path, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        feed_path = Path(temp_dir) / "metro_stl_gtfs.zip"
        with zipfile.ZipFile(feed_path, "w") as archive:
            archive.writestr(
                "stops.txt",
                "stop_id,stop_name,stop_lat,stop_lon\n1,Near Stop,38.6270,-90.1994\n2,Far Stop,38.8000,-90.4000\n",
            )
        yield feed_path


def test_load_gtfs_stops_and_compute_transit_accessibility(
    monkeypatch: pytest.MonkeyPatch, gtfs_feed_path: Path
) -> None:
    monkeypatch.setenv("TWA_GTFS_FEED_PATH", str(gtfs_feed_path))
    monkeypatch.setenv("TWA_TRANSIT_STOP_RADIUS_MILES", "0.6")
    get_settings.cache_clear()

    stops = load_gtfs_stops(gtfs_feed_path, force_refresh=True)
    assert len(stops) == 2

    accessible = compute_transit_accessibility(job_lat=38.6270, job_lon=-90.1994)
    assert accessible.transit_accessible is True
    assert accessible.nearest_stop_distance_miles is not None

    unreachable = compute_transit_accessibility(job_lat=38.9000, job_lon=-90.5000)
    assert unreachable.transit_accessible is False
    get_settings.cache_clear()


def test_zip_to_job_distance_returns_distance() -> None:
    distance = zip_to_job_distance_miles("63103", job_lat=38.6270, job_lon=-90.1994)
    assert distance is not None
    assert distance >= 0


def test_geocode_address_parses_nominatim_response() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json=[
                {
                    "lat": "38.6270",
                    "lon": "-90.1994",
                    "display_name": "St. Louis, Missouri, USA",
                }
            ],
        )
    )
    with httpx.Client(transport=transport) as client:
        result = geocode_address(
            address="123 Main St", city="St. Louis", zip_code="63103", client=client
        )

    assert result is not None
    assert result.latitude == 38.6270
    assert result.longitude == -90.1994


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'phase8.db'}"


@pytest.fixture()
def session_factory(sqlite_url: str):
    from app.db.base import Base

    engine = create_engine(sqlite_url)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    try:
        yield factory
    finally:
        engine.dispose()


@pytest.fixture()
def phase8_env(monkeypatch: pytest.MonkeyPatch, session_factory):
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DEBUG", "false")
    get_settings.cache_clear()
    app = create_app()

    state = {
        "identity": AuthProviderIdentity(
            auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            email="employer@example.com",
            auth_provider_role="user",
        )
    }

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    def override_identity() -> AuthProviderIdentity:
        return state["identity"]

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as client:
        yield client, state, session_factory, monkeypatch

    app.dependency_overrides.clear()
    get_settings.cache_clear()


def seed_staff(session_factory) -> AppUser:
    with session_factory() as session:
        staff = AppUser(
            auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            email="staff@example.com",
            auth_provider_role="admin",
            app_role=AppRole.STAFF,
            is_active=True,
        )
        session.add(staff)
        session.commit()
        session.refresh(staff)
        return staff


def approve_employer(client: TestClient, state: dict, session_factory) -> None:
    staff = seed_staff(session_factory)
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id, email=staff.email, auth_provider_role="admin"
    )
    employer_id = client.get("/api/v1/admin/queue/employers").json()["items"][0]["id"]
    response = client.patch(
        f"/api/v1/admin/employers/{employer_id}", json={"review_status": "approved"}
    )
    assert response.status_code == 200
    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )


def test_listing_creation_computes_location_fields(phase8_env) -> None:
    client, state, session_factory, monkeypatch = phase8_env
    monkeypatch.setattr(
        "app.services.employer.geocode_address",
        lambda **_: GeocodeResult(38.6270, -90.1994, "St. Louis"),
    )
    monkeypatch.setattr(
        "app.services.employer.compute_transit_accessibility",
        lambda **_: TransitComputationResult(
            transit_accessible=True, nearest_stop_distance_miles=0.2, warning=None
        ),
    )

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200
    approve_employer(client, state, session_factory)

    create_listing = client.post(
        "/api/v1/employer/listings",
        json={
            "title": "Warehouse Associate",
            "location_address": "2000 North Broadway",
            "city": "St. Louis",
            "zip": "63102",
        },
    )
    assert create_listing.status_code == 200
    payload = create_listing.json()["listing"]
    assert payload["job_lat"] == 38.627
    assert payload["job_lon"] == -90.1994
    assert payload["transit_accessible"] is True

    with session_factory() as session:
        stored = session.execute(select(JobListing)).scalar_one()
    assert stored.job_lat == 38.6270
    assert stored.transit_accessible is True


def test_listing_creation_survives_geocoding_failure(phase8_env) -> None:
    client, state, session_factory, monkeypatch = phase8_env
    monkeypatch.setattr("app.services.employer.geocode_address", lambda **_: None)

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200
    approve_employer(client, state, session_factory)

    create_listing = client.post(
        "/api/v1/employer/listings",
        json={
            "title": "Warehouse Associate",
            "location_address": "2000 North Broadway",
            "city": "St. Louis",
            "zip": "63102",
        },
    )
    assert create_listing.status_code == 200
    payload = create_listing.json()["listing"]
    assert payload["job_lat"] is None
    assert payload["job_lon"] is None
    assert payload["transit_accessible"] is None

    with session_factory() as session:
        stored = session.execute(select(JobListing)).scalar_one()
        audits = session.execute(select(AuditLog)).scalars().all()
    assert stored.job_lat is None
    assert any(audit.action == "listing.location_warning" for audit in audits)
