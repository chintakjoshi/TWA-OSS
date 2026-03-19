from __future__ import annotations

import csv
import math
import zipfile
from dataclasses import dataclass
from pathlib import Path

import pgeocode

from app.core.config import get_settings


@dataclass(slots=True)
class TransitStop:
    stop_id: str
    stop_name: str | None
    latitude: float
    longitude: float


@dataclass(slots=True)
class TransitComputationResult:
    transit_accessible: bool | None
    nearest_stop_distance_miles: float | None
    warning: str | None = None


_STOP_CACHE: dict[Path, tuple[float, list[TransitStop]]] = {}
_US_ZIP_LOOKUP = pgeocode.Nominatim("us")



def load_gtfs_stops(feed_path: Path | None = None, *, force_refresh: bool = False) -> list[TransitStop]:
    settings = get_settings()
    resolved_path = Path(feed_path or settings.gtfs_feed_path).resolve()
    if not resolved_path.exists():
        raise FileNotFoundError(f"GTFS feed not found at {resolved_path}")

    mtime = resolved_path.stat().st_mtime
    cached = _STOP_CACHE.get(resolved_path)
    if cached and cached[0] == mtime and not force_refresh:
        return cached[1]

    with zipfile.ZipFile(resolved_path) as archive:
        with archive.open("stops.txt") as stops_file:
            reader = csv.DictReader(line.decode("utf-8-sig") for line in stops_file)
            stops = [
                TransitStop(
                    stop_id=row.get("stop_id", ""),
                    stop_name=row.get("stop_name"),
                    latitude=float(row["stop_lat"]),
                    longitude=float(row["stop_lon"]),
                )
                for row in reader
                if row.get("stop_lat") and row.get("stop_lon")
            ]

    _STOP_CACHE[resolved_path] = (mtime, stops)
    return stops



def haversine_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_miles = 3958.7613
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    d_lat = lat2_rad - lat1_rad
    d_lon = lon2_rad - lon1_rad
    a = math.sin(d_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_miles * c



def compute_transit_accessibility(*, job_lat: float | None, job_lon: float | None) -> TransitComputationResult:
    if job_lat is None or job_lon is None:
        return TransitComputationResult(
            transit_accessible=None,
            nearest_stop_distance_miles=None,
            warning="Job coordinates are unavailable for transit computation.",
        )

    settings = get_settings()
    try:
        stops = load_gtfs_stops()
    except (FileNotFoundError, KeyError, zipfile.BadZipFile):
        return TransitComputationResult(
            transit_accessible=None,
            nearest_stop_distance_miles=None,
            warning="GTFS feed is unavailable for transit computation.",
        )

    nearest_distance = min(
        (haversine_distance_miles(job_lat, job_lon, stop.latitude, stop.longitude) for stop in stops),
        default=None,
    )
    if nearest_distance is None:
        return TransitComputationResult(
            transit_accessible=None,
            nearest_stop_distance_miles=None,
            warning="No GTFS stops were available for transit computation.",
        )

    return TransitComputationResult(
        transit_accessible=nearest_distance <= settings.transit_stop_radius_miles,
        nearest_stop_distance_miles=nearest_distance,
        warning=None,
    )



def zip_to_job_distance_miles(zip_code: str | None, *, job_lat: float | None, job_lon: float | None) -> float | None:
    if not zip_code or job_lat is None or job_lon is None:
        return None

    record = _US_ZIP_LOOKUP.query_postal_code(str(zip_code).strip())
    zip_lat = getattr(record, "latitude", None)
    zip_lon = getattr(record, "longitude", None)
    if zip_lat is None or zip_lon is None:
        return None
    try:
        return haversine_distance_miles(float(zip_lat), float(zip_lon), job_lat, job_lon)
    except (TypeError, ValueError):
        return None
