from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.core.config import get_settings


@dataclass(slots=True)
class GeocodeResult:
    latitude: float
    longitude: float
    display_name: str | None = None


def geocode_address(
    *,
    address: str | None,
    city: str | None,
    zip_code: str | None,
    client: httpx.Client | None = None,
) -> GeocodeResult | None:
    if not address or not city or not zip_code:
        return None

    settings = get_settings()
    query = ", ".join(
        part
        for part in [address.strip(), city.strip(), zip_code.strip(), "USA"]
        if part
    )
    headers = {"User-Agent": settings.geocoding_user_agent}
    params = {"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "us"}

    if client is not None:
        return _request_geocode(client=client, headers=headers, params=params)

    try:
        with httpx.Client(
            timeout=settings.geocoding_timeout_seconds, headers=headers
        ) as request_client:
            return _request_geocode(
                client=request_client, headers=headers, params=params
            )
    except httpx.HTTPError:
        return None


def _request_geocode(
    *, client: httpx.Client, headers: dict[str, str], params: dict[str, str | int]
) -> GeocodeResult | None:
    try:
        response = client.get(
            get_settings().geocoding_base_url, headers=headers, params=params
        )
        response.raise_for_status()
    except httpx.HTTPError:
        return None

    payload = response.json()
    if not payload:
        return None

    first = payload[0]
    lat = first.get("lat")
    lon = first.get("lon")
    if lat is None or lon is None:
        return None

    try:
        return GeocodeResult(
            latitude=float(lat),
            longitude=float(lon),
            display_name=first.get("display_name"),
        )
    except (TypeError, ValueError):
        return None
