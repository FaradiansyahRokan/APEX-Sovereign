"""
HAVEN HUMANITY — Crisis Zone Oracle
====================================
Layer 6 (Lapisan Geo): Geo-Fenced Scarcity Zones

Konsep: Sistem secara otomatis mem-pull data krisis realtime dari GDACS (Global
Disaster Alert and Coordination System) dan ReliefWeb API. Jika volunteer
berada dalam zona krisis aktif → impact multiplier naik.

"Seseorang yang berani bergerak di zona berbahaya mendapat penghargaan
lebih karena sistem TAHU bahwa lokasi itu sedang dalam krisis."

Fallback: Jika API tidak tersedia (offline/no key) → multiplier = 1.0 (netral).
"""

from __future__ import annotations

import json
import logging
import math
import os
import time
from typing import Optional

logger = logging.getLogger("satin.crisis_zone")

# ── Cache settings ─────────────────────────────────────────────────────────────
_CRISIS_CACHE: dict = {}
_CACHE_TTL_SEC = int(os.getenv("CRISIS_CACHE_TTL_SEC", "3600"))   # refresh every hour
_LAST_FETCH_TS: float = 0.0

# ── Crisis multiplier bounds ───────────────────────────────────────────────────
CRISIS_MULTIPLIER_MIN = 1.00   # no crisis → no bonus
CRISIS_MULTIPLIER_MAX = 2.00   # maximum 2× for catastrophic active zones
CRISIS_RADIUS_KM      = 200.0  # volunteer must be within 200km of crisis epicentre


# ══════════════════════════════════════════════════════════════════════════════
# GDACS DATA STRUCTURES
# ══════════════════════════════════════════════════════════════════════════════

class CrisisEvent:
    """Represents a single active crisis event."""
    def __init__(
        self,
        event_id:   str,
        name:       str,
        severity:   float,     # 0.0 – 1.0 (GDACS alert score normalised)
        lat:        float,
        lon:        float,
        radius_km:  float,     # affected radius in km
        event_type: str,       # FLOOD, EARTHQUAKE, CYCLONE, etc.
    ):
        self.event_id   = event_id
        self.name       = name
        self.severity   = min(1.0, max(0.0, severity))
        self.lat        = lat
        self.lon        = lon
        self.radius_km  = radius_km
        self.event_type = event_type

    def distance_km(self, volunteer_lat: float, volunteer_lon: float) -> float:
        """Haversine distance from volunteer GPS to crisis epicentre."""
        R   = 6371.0
        p   = math.pi / 180
        dlat = (volunteer_lat - self.lat) * p
        dlon = (volunteer_lon - self.lon) * p
        a = math.sin(dlat / 2) ** 2 + (
            math.cos(self.lat * p) * math.cos(volunteer_lat * p) * math.sin(dlon / 2) ** 2
        )
        return 2 * R * math.asin(math.sqrt(a))

    def multiplier_at(self, volunteer_lat: float, volunteer_lon: float) -> float:
        """
        Returns impact multiplier for this crisis at the volunteer location.
        Multiplier decays linearly from max (at epicentre) to 1.0 (at radius edge).
        Beyond radius → 1.0 (no bonus).
        """
        dist = self.distance_km(volunteer_lat, volunteer_lon)
        effective_radius = max(self.radius_km, CRISIS_RADIUS_KM)
        if dist > effective_radius:
            return 1.0
        # Linear decay: 1.0 at edge, max at centre
        proximity_factor = 1.0 - (dist / effective_radius)
        bonus            = (CRISIS_MULTIPLIER_MAX - 1.0) * self.severity * proximity_factor
        return round(1.0 + bonus, 4)


# ══════════════════════════════════════════════════════════════════════════════
# GDACS FETCHER
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_gdacs_events() -> list[CrisisEvent]:
    """
    Fetch active crisis events from GDACS GeoJSON feed.
    GDACS is a free, no-auth-required API from the UN.
    Returns list of CrisisEvent objects.
    """
    import urllib.request
    GDACS_GEOJSON_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS"
    events = []
    try:
        with urllib.request.urlopen(GDACS_GEOJSON_URL, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        features = data.get("features", [])
        for feat in features:
            props = feat.get("properties", {})
            geom  = feat.get("geometry", {})
            coords = geom.get("coordinates", [0.0, 0.0])
            if not coords or len(coords) < 2:
                continue

            # GDACS alert levels: 0=green, 1=orange, 2=red
            alert_level = props.get("alertlevel", "Green").lower()
            severity_map = {"green": 0.3, "orange": 0.65, "red": 1.0}
            severity = severity_map.get(alert_level, 0.3)

            events.append(CrisisEvent(
                event_id   = str(props.get("eventid", "")),
                name       = props.get("eventname", "Unknown Crisis"),
                severity   = severity,
                lat        = float(coords[1]),
                lon        = float(coords[0]),
                radius_km  = float(props.get("affectedcountries", [{}])[0].get("area", 100)),
                event_type = props.get("eventtype", "UNKNOWN"),
            ))
        logger.info(f"[CrisisOracle] Fetched {len(events)} active events from GDACS")
    except Exception as e:
        logger.warning(f"[CrisisOracle] GDACS fetch failed: {e} — using empty crisis list")

    return events


def _fetch_reliefweb_crises() -> list[CrisisEvent]:
    """
    Fetch active disasters from ReliefWeb API (UN OCHA).
    Provides additional coverage beyond GDACS.
    Uses Nominatim to geocode the approximate country/region.
    """
    import urllib.request
    import urllib.parse
    import time

    RELIEFWEB_URL = "https://api.reliefweb.int/v1/disasters?appname=haven-humanity&filter[field]=status&filter[value]=current&limit=10&fields[include][]=name&fields[include][]=country&fields[include][]=type&fields[include][]=glide"
    events = []

    def _geocode_country(country_name: str) -> tuple[float, float]:
        """Geocodes a country name to lat/lon using OpenStreetMap Nominatim."""
        if not country_name:
            return 0.0, 0.0
        try:
            url = f"https://nominatim.openstreetmap.org/search?country={urllib.parse.quote(country_name)}&format=json&limit=1"
            req = urllib.request.Request(url, headers={'User-Agent': 'HavenHumanity-Oracle/1.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode("utf-8"))
                if data:
                    return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception:
            pass
        return 0.0, 0.0

    try:
        with urllib.request.urlopen(RELIEFWEB_URL, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        for item in data.get("data", []):
            f = item.get("fields", {})
            country_list = f.get("country", [{}])
            country_name = country_list[0].get("name", "") if country_list else ""
            name = f.get("name", "Active Disaster")

            # Try to geocode the country 
            lat, lon = _geocode_country(country_name)
            time.sleep(1) # respect Nominatim limit of 1 req/sec

            events.append(CrisisEvent(
                event_id   = str(item.get("id", "")),
                name       = name,
                severity   = 0.60,  # reliefweb doesn't have severity — use medium
                lat        = lat,
                lon        = lon,
                radius_km  = 500.0,
                event_type = f.get("type", [{}])[0].get("name", "DISASTER") if f.get("type") else "DISASTER",
            ))
        logger.info(f"[CrisisOracle] Fetched {len(events)} events from ReliefWeb")
    except Exception as e:
        logger.warning(f"[CrisisOracle] ReliefWeb fetch failed: {e}")

    # Only return events where geocoding succeeded
    return [e for e in events if e.lat != 0.0 or e.lon != 0.0]


# ══════════════════════════════════════════════════════════════════════════════
# MAIN CLASS
# ══════════════════════════════════════════════════════════════════════════════

class CrisisZoneOracle:
    """
    Geo-fenced crisis zone multiplier.

    Usage:
        oracle = CrisisZoneOracle()
        result = oracle.get_multiplier(lat=-6.92, lon=107.72)
        # result = {"multiplier": 1.45, "in_crisis_zone": True, "crisis_name": "...", ...}
    """

    def __init__(self):
        self._events: list[CrisisEvent] = []
        self._last_refresh: float = 0.0
        self._enabled = True

    def _maybe_refresh(self):
        """Refresh crisis list if cache is stale."""
        now = time.time()
        if now - self._last_refresh > _CACHE_TTL_SEC:
            logger.info("[CrisisOracle] Refreshing crisis data...")
            gdacs     = _fetch_gdacs_events()
            reliefweb = _fetch_reliefweb_crises()
            self._events      = gdacs + reliefweb
            self._last_refresh = now

    def get_multiplier(
        self,
        volunteer_lat: float,
        volunteer_lon: float,
    ) -> dict:
        """
        Returns the geo-crisis multiplier for a volunteer's location.

        Returns dict:
            multiplier:    float (1.0 = no bonus, up to 2.0)
            in_crisis_zone: bool
            crisis_name:   str | None
            crisis_type:   str | None
            crisis_severity: float
            active_events_nearby: int
        """
        if not self._enabled:
            return self._neutral()

        try:
            self._maybe_refresh()
        except Exception as e:
            logger.warning(f"[CrisisOracle] Refresh error: {e}")
            return self._neutral()

        if not self._events:
            return self._neutral()

        best_multiplier  = 1.0
        best_event       = None
        nearby_count     = 0

        for event in self._events:
            m = event.multiplier_at(volunteer_lat, volunteer_lon)
            if m > 1.0:
                nearby_count += 1
                if m > best_multiplier:
                    best_multiplier = m
                    best_event      = event

        result = {
            "multiplier":            round(best_multiplier, 4),
            "in_crisis_zone":        best_multiplier > 1.0,
            "crisis_name":           best_event.name       if best_event else None,
            "crisis_type":           best_event.event_type if best_event else None,
            "crisis_severity":       best_event.severity   if best_event else 0.0,
            "active_events_nearby":  nearby_count,
        }

        if result["in_crisis_zone"]:
            logger.info(
                f"[CrisisOracle] 🚨 Crisis zone! "
                f"{result['crisis_name']} ({result['crisis_type']}) "
                f"→ multiplier={result['multiplier']:.2f}×"
            )
        else:
            logger.info(f"[CrisisOracle] No active crisis near ({volunteer_lat:.3f}, {volunteer_lon:.3f})")

        return result

    @staticmethod
    def _neutral() -> dict:
        return {
            "multiplier":           1.0,
            "in_crisis_zone":       False,
            "crisis_name":          None,
            "crisis_type":          None,
            "crisis_severity":      0.0,
            "active_events_nearby": 0,
        }


# ══════════════════════════════════════════════════════════════════════════════
# STANDALONE TEST
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    oracle = CrisisZoneOracle()
    # Test: Jakarta, Indonesia
    r = oracle.get_multiplier(-6.2088, 106.8456)
    print(f"Jakarta: {r}")
    # Test: Türkiye earthquake zone
    r2 = oracle.get_multiplier(37.9, 37.5)
    print(f"Türkiye: {r2}")
