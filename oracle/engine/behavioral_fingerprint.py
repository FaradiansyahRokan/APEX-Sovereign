"""
HAVEN HUMANITY — Behavioral Fingerprint Module
==============================================
Lapisan Anti-Sybil: Temporal Behavioral Fingerprinting

Konsep: AI mempelajari *ritme perilaku* setiap volunteer dari waktu ke waktu.
Pattern pengiriman submission, waktu aktif, rotasi lokasi GPS, dan interval
antar-event. Jika tiba-tiba ada anomali besar → auto-quarantine.

"Manusia nyata punya ritme hidup. Bot punya pola yang terlalu sempurna."

Deteksi:
  - Burst submission: terlalu banyak submission dalam interval pendek
  - GPS teleportation: lokasi berpindah terlalu jauh dalam waktu singkat
  - Clock regularity: submission selalu pada waktu yang sama (bot-like)
  - Velocity spike: frekuensi submission tiba-tiba 10x dari baseline
"""

from __future__ import annotations

import json
import logging
import math
import time
from typing import Optional

logger = logging.getLogger("satin.behavioral")

# ── Config ─────────────────────────────────────────────────────────────────────
MIN_SUBMISSIONS_FOR_PROFILE = 3     # need at least 3 submissions to build a profile
GPS_TELEPORT_IMPOSSIBLE_KMH = 900   # faster than commercial plane = teleportation
CLOCK_REGULARITY_THRESHOLD  = 0.15  # std deviation < 15% of mean interval = bot-like
VELOCITY_SPIKE_FACTOR       = 5.0   # current rate > 5× baseline = spike
HISTORY_WINDOW_DAYS         = 30    # look back 30 days for profile


# ══════════════════════════════════════════════════════════════════════════════
# RESULT
# ══════════════════════════════════════════════════════════════════════════════

class BehaviorResult:
    def __init__(self):
        self.anomalies:    list[str] = []
        self.penalty:      float     = 0.0
        self.is_quarantine: bool     = False
        self.risk_score:   float     = 0.0   # 0.0 (clean) to 1.0 (highly anomalous)

    def flag(self, code: str, penalty: float, reason: str = ""):
        self.anomalies.append(code)
        self.penalty = min(1.0, self.penalty + penalty)
        logger.warning(f"[BehaviorFP] ANOMALY: {code} +{penalty:.0%} — {reason}")

    def to_dict(self) -> dict:
        return {
            "anomalies":     self.anomalies,
            "penalty":       round(self.penalty, 4),
            "is_quarantine": self.is_quarantine,
            "risk_score":    round(self.risk_score, 4),
        }


# ══════════════════════════════════════════════════════════════════════════════
# MAIN CLASS
# ══════════════════════════════════════════════════════════════════════════════

class BehavioralFingerprintDetector:
    """
    Stateful behavioral anomaly detector using Redis for history.

    Usage:
        detector = BehavioralFingerprintDetector(redis_client)
        result = detector.analyze(
            volunteer_address = "0x...",
            current_lat       = -6.92,
            current_lon       = 107.72,
            current_ts        = int(time.time()),
        )
        if result.is_quarantine:
            raise HTTPException(403, "Behavioral anomaly detected")
    """

    def __init__(self, redis_client):
        self._redis = redis_client

    # ─────────────────────────────────────────────────────────────────────────
    def analyze(
        self,
        volunteer_address: str,
        current_lat:       float,
        current_lon:       float,
        current_ts:        Optional[int] = None,
    ) -> BehaviorResult:
        result = BehaviorResult()
        addr   = volunteer_address.lower()
        ts     = current_ts or int(time.time())
        cutoff = ts - (HISTORY_WINDOW_DAYS * 86400)

        # Load history
        history = self._load_history(addr, cutoff)

        if len(history) >= MIN_SUBMISSIONS_FOR_PROFILE:
            self._check_gps_teleportation(result, history, current_lat, current_lon, ts)
            self._check_clock_regularity(result, history, ts)
            self._check_velocity_spike(result, history, ts)

        # Always check burst (uses recent window, needs no history)
        self._check_burst(result, history, ts)

        # Compute risk score
        result.risk_score = min(1.0, len(result.anomalies) * 0.25 + result.penalty * 0.5)
        result.is_quarantine = result.risk_score >= 0.75 or result.penalty >= 0.60

        # Record current submission to history
        self._record(addr, ts, current_lat, current_lon)

        return result

    # ─────────────────────────────────────────────────────────────────────────
    def _load_history(self, addr: str, cutoff: int) -> list[dict]:
        key = f"satin:behavior:{addr}"
        raw = self._redis.get(key)
        if not raw:
            return []
        history = json.loads(raw)
        # Filter old entries
        return [h for h in history if h.get("ts", 0) >= cutoff]

    def _record(self, addr: str, ts: int, lat: float, lon: float):
        key = f"satin:behavior:{addr}"
        raw = self._redis.get(key)
        history = json.loads(raw) if raw else []
        history.append({"ts": ts, "lat": lat, "lon": lon})
        # Keep only last 100 entries
        history = sorted(history, key=lambda h: h["ts"])[-100:]
        self._redis.set(key, json.dumps(history))

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 1: GPS Teleportation
    # ─────────────────────────────────────────────────────────────────────────
    def _check_gps_teleportation(
        self,
        result:      BehaviorResult,
        history:     list[dict],
        current_lat: float,
        current_lon: float,
        current_ts:  int,
    ):
        """
        Detects if the volunteer appeared to move faster than a commercial plane
        between their last submission and this one.
        """
        if not history:
            return
        last = history[-1]
        dt_hours = (current_ts - last["ts"]) / 3600.0
        if dt_hours <= 0:
            return

        dist_km = _haversine_km(last["lat"], last["lon"], current_lat, current_lon)
        speed_kmh = dist_km / dt_hours

        if speed_kmh > GPS_TELEPORT_IMPOSSIBLE_KMH:
            result.flag(
                "gps_teleportation",
                0.50,
                f"GPS moved {dist_km:.0f}km in {dt_hours:.1f}h = {speed_kmh:.0f} km/h "
                f"(faster than a plane — physically impossible)"
            )

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 2: Clock Regularity (Bot-like fixed intervals)
    # ─────────────────────────────────────────────────────────────────────────
    def _check_clock_regularity(
        self,
        result:  BehaviorResult,
        history: list[dict],
        current_ts: int,
    ):
        """
        Bots submit at unnaturally regular intervals.
        Humans are irregular. Coefficient of variation (CoV) of intervals
        < CLOCK_REGULARITY_THRESHOLD → suspicious regularity.
        """
        if len(history) < 6:
            return

        timestamps = sorted([h["ts"] for h in history] + [current_ts])
        intervals  = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]

        if not intervals:
            return

        mean_interval = sum(intervals) / len(intervals)
        if mean_interval <= 0:
            return

        std_dev = math.sqrt(sum((x - mean_interval) ** 2 for x in intervals) / len(intervals))
        cov     = std_dev / mean_interval  # coefficient of variation

        if cov < CLOCK_REGULARITY_THRESHOLD:
            result.flag(
                "clock_regularity_anomaly",
                0.30,
                f"Submission intervals are suspiciously regular (CoV={cov:.3f} < {CLOCK_REGULARITY_THRESHOLD}). "
                f"Mean interval: {mean_interval/60:.1f} min. Humans are not this consistent."
            )

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 3: Velocity Spike
    # ─────────────────────────────────────────────────────────────────────────
    def _check_velocity_spike(
        self,
        result:     BehaviorResult,
        history:    list[dict],
        current_ts: int,
    ):
        """
        Compare recent submission rate vs historical baseline.
        If recent 24h rate > VELOCITY_SPIKE_FACTOR × 30-day baseline → suspicious.
        """
        now             = current_ts
        window_24h      = now - 86400
        window_30d      = now - (HISTORY_WINDOW_DAYS * 86400)

        count_24h = sum(1 for h in history if h["ts"] >= window_24h)
        count_30d = sum(1 for h in history if h["ts"] >= window_30d)

        if count_30d < MIN_SUBMISSIONS_FOR_PROFILE:
            return

        days_in_history = (now - min(h["ts"] for h in history)) / 86400.0
        if days_in_history <= 1:
            return

        daily_baseline = count_30d / days_in_history
        if daily_baseline <= 0:
            return

        if count_24h > daily_baseline * VELOCITY_SPIKE_FACTOR and count_24h >= 3:
            result.flag(
                "velocity_spike",
                0.25,
                f"Submission rate spike: {count_24h} in 24h vs baseline {daily_baseline:.1f}/day "
                f"({count_24h/daily_baseline:.1f}× normal rate)"
            )

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 4: Burst Detection
    # ─────────────────────────────────────────────────────────────────────────
    def _check_burst(
        self,
        result:     BehaviorResult,
        history:    list[dict],
        current_ts: int,
    ):
        """
        More than 3 submissions within 10 minutes = burst pattern.
        Even legitimate helpers can't simultaneously verify from multiple devices.
        """
        window_10min = current_ts - 600
        recent = [h for h in history if h["ts"] >= window_10min]

        if len(recent) >= 3:
            result.flag(
                "burst_submission",
                0.35,
                f"{len(recent)} submissions in the last 10 minutes. "
                f"Real humanitarian work takes time — this pattern suggests automation."
            )


# ── Utilities ──────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R   = 6371.0
    p   = math.pi / 180
    a   = (
        math.sin((lat2 - lat1) * p / 2) ** 2
        + math.cos(lat1 * p) * math.cos(lat2 * p)
        * math.sin((lon2 - lon1) * p / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))
