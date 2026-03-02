"""
APEX HUMANITY — Civilization Resilience Engine
================================================
LAYER 6 — CIVILIZATION-LEVEL RESILIENCE

Architecture Bible:
    "APEX harus survive Internet outage, AGI attack, dan 100 tahun dari sekarang."

Fitur Utama:
  1. Offline Queue       — submission saat internet mati disimpan lokal, sync saat online
  2. Circuit Breaker     — jika AI approval rate > threshold historis → pause evaluasi
  3. AGI Safeguard       — deteksi distribusi skor anomali → trigger human audit
  4. Resilience Scoring  — status kesehatan sistem secara real-time

AGI Circuit Breaker Logic:
    Jika 100 submission terakhir approve rate > 95% → evaluasi terlalu mudah
    → pause 1 jam dan request human audit

UN SDG Integration (stubs):
    SDG mapping untuk setiap action type.
"""

from __future__ import annotations

import json
import logging
import math
import statistics
import time
from dataclasses import dataclass, field
from typing import Optional, List

logger = logging.getLogger("satin.resilience")


# ── Config ──────────────────────────────────────────────────────────────────────
CIRCUIT_BREAKER_WINDOW   = 100    # last N submissions to evaluate
CIRCUIT_BREAKER_THRESHOLD = 0.95  # if approve_rate > 95% → suspicious
CIRCUIT_BREAKER_PAUSE_SEC = 3600  # pause duration (1 hour)
OFFLINE_QUEUE_MAX        = 1000   # max offline submissions stored

# UN SDG Mapping — action_type → SDG numbers
SDG_MAPPING = {
    "FOOD_DISTRIBUTION":    [2, 1],       # SDG 2: Zero Hunger, SDG 1: No Poverty
    "MEDICAL_AID":          [3],          # SDG 3: Good Health
    "SHELTER_CONSTRUCTION": [11, 1],      # SDG 11: Sustainable Cities, SDG 1: No Poverty
    "EDUCATION_SESSION":    [4],          # SDG 4: Quality Education
    "DISASTER_RELIEF":      [11, 13, 1],  # SDG 11, 13: Climate Action
    "CLEAN_WATER_PROJECT":  [6, 3],       # SDG 6: Clean Water
    "MENTAL_HEALTH_SUPPORT":[3, 10],      # SDG 3: Health, 10: Reduced Inequalities
    "ENVIRONMENTAL_ACTION": [13, 15],     # SDG 13: Climate, 15: Life on Land
}


# ══════════════════════════════════════════════════════════════════════════════
# OFFLINE SUBMISSION QUEUE
# ══════════════════════════════════════════════════════════════════════════════

class OfflineQueue:
    """
    Stores impact submissions when oracle API is unreachable.
    Syncs automatically when connectivity is restored.
    """

    def __init__(self, redis_client):
        self._r = redis_client

    def _queue_key(self) -> str:
        return "satin:resilience:offline_queue"

    def enqueue(self, submission: dict) -> dict:
        """Add a submission to the offline queue."""
        submission["queued_at"] = int(time.time())
        submission["queue_id"]  = f"offline_{int(time.time())}_{hash(str(submission)) % 10000}"

        queue_len = self._r.llen(self._queue_key())
        if queue_len >= OFFLINE_QUEUE_MAX:
            return {
                "queued":  False,
                "reason":  f"Offline queue full ({OFFLINE_QUEUE_MAX} max). Try again later.",
                "queue_size": queue_len,
            }

        self._r.lpush(self._queue_key(), json.dumps(submission))
        logger.info(f"[Resilience] Offline submission queued: {submission.get('queue_id')}")
        return {
            "queued":    True,
            "queue_id":  submission["queue_id"],
            "queue_size": queue_len + 1,
            "note":      "Will process when oracle connectivity is restored.",
        }

    def get_queue(self) -> List[dict]:
        """Get all queued submissions."""
        raw_list = self._r.lrange(self._queue_key(), 0, -1) or []
        result = []
        for raw in raw_list:
            try:
                result.append(json.loads(raw))
            except Exception:
                pass
        return result

    def dequeue_all(self) -> List[dict]:
        """Retrieve all queued submissions for processing and clear queue."""
        items = self.get_queue()
        if items:
            self._r.delete(self._queue_key())
            logger.info(f"[Resilience] Dequeued {len(items)} offline submissions for processing")
        return items

    def queue_size(self) -> int:
        return self._r.llen(self._queue_key()) or 0


# ══════════════════════════════════════════════════════════════════════════════
# CIRCUIT BREAKER
# ══════════════════════════════════════════════════════════════════════════════

class CircuitBreaker:
    """
    AGI-resistant circuit breaker.
    If AI approval rate is suspiciously high → pause evaluations + trigger audit.
    """

    def __init__(self, redis_client):
        self._r = redis_client

    def _history_key(self) -> str:
        return "satin:resilience:eval_history"

    def _pause_key(self) -> str:
        return "satin:resilience:circuit_pause"

    def _audit_key(self) -> str:
        return "satin:resilience:human_audits"

    def record_evaluation(self, approved: bool, score: float, event_id: str):
        """Record each evaluation outcome for circuit breaker monitoring."""
        entry = json.dumps({"approved": approved, "score": score, "ts": time.time()})
        self._r.lpush(self._history_key(), entry)
        self._r.ltrim(self._history_key(), 0, CIRCUIT_BREAKER_WINDOW - 1)

    def check_and_trip(self) -> dict:
        """Check if circuit breaker should trip. Returns status dict."""
        # Already paused?
        pause_until = self._r.get(self._pause_key())
        if pause_until and float(pause_until) > time.time():
            remaining = int(float(pause_until) - time.time())
            return {
                "tripped":  True,
                "reason":   "circuit_breaker_active",
                "resume_in_sec": remaining,
            }

        # Analyze recent history
        raw_list = self._r.lrange(self._history_key(), 0, -1) or []
        if len(raw_list) < CIRCUIT_BREAKER_WINDOW // 2:
            return {"tripped": False, "reason": "insufficient_history"}

        history = []
        for raw in raw_list:
            try:
                history.append(json.loads(raw))
            except Exception:
                pass

        if not history:
            return {"tripped": False, "reason": "no_history"}

        approve_rate = sum(1 for h in history if h.get("approved")) / len(history)

        if approve_rate > CIRCUIT_BREAKER_THRESHOLD:
            # TRIP the circuit breaker
            resume_at = time.time() + CIRCUIT_BREAKER_PAUSE_SEC
            self._r.set(self._pause_key(), str(resume_at))
            self._r.expire(self._pause_key(), CIRCUIT_BREAKER_PAUSE_SEC + 60)

            # Request human audit
            audit_entry = json.dumps({
                "triggered_at":  int(time.time()),
                "approve_rate":  round(approve_rate, 4),
                "window_size":   len(history),
                "resume_at":     int(resume_at),
            })
            self._r.lpush(self._audit_key(), audit_entry)
            self._r.ltrim(self._audit_key(), 0, 99)

            logger.critical(
                f"[Resilience] CIRCUIT BREAKER TRIPPED! "
                f"approve_rate={approve_rate:.1%} > threshold={CIRCUIT_BREAKER_THRESHOLD:.1%}. "
                f"Pausing {CIRCUIT_BREAKER_PAUSE_SEC // 3600}h. Human audit requested."
            )
            return {
                "tripped":     True,
                "reason":      "approval_rate_too_high",
                "approve_rate": round(approve_rate, 4),
                "resume_at":   int(resume_at),
            }

        return {
            "tripped":     False,
            "approve_rate": round(approve_rate, 4),
            "window_size": len(history),
        }

    def get_audit_log(self) -> List[dict]:
        raw_list = self._r.lrange(self._audit_key(), 0, -1) or []
        audits = []
        for raw in raw_list:
            try:
                audits.append(json.loads(raw))
            except Exception:
                pass
        return audits

    def reset(self) -> dict:
        """Manually reset circuit breaker (DAO admin only)."""
        self._r.delete(self._pause_key())
        logger.info("[Resilience] Circuit breaker manually reset by DAO admin.")
        return {"reset": True}


# ══════════════════════════════════════════════════════════════════════════════
# UN SDG INTEGRATION
# ══════════════════════════════════════════════════════════════════════════════

def get_sdg_alignment(action_type: str) -> List[int]:
    """Returns list of UN SDG numbers this action contributes to."""
    return SDG_MAPPING.get(action_type.upper(), [])


# ══════════════════════════════════════════════════════════════════════════════
# RESILIENCE ENGINE (main interface)
# ══════════════════════════════════════════════════════════════════════════════

class ResilienceEngine:
    """
    Master Layer 6 Civilization Resilience interface.
    """

    def __init__(self, redis_client):
        self._r       = redis_client
        self.queue    = OfflineQueue(redis_client)
        self.breaker  = CircuitBreaker(redis_client)

    def get_resilience_status(self) -> dict:
        """Full system resilience status."""
        breaker_status = self.breaker.check_and_trip()
        queue_size     = self.queue.queue_size()
        audit_log      = self.breaker.get_audit_log()

        return {
            "circuit_breaker": {
                "tripped":      breaker_status.get("tripped", False),
                "approve_rate": breaker_status.get("approve_rate", 0.0),
                "reason":       breaker_status.get("reason", ""),
            },
            "offline_queue": {
                "size":         queue_size,
                "max_capacity": OFFLINE_QUEUE_MAX,
                "pct_full":     round(queue_size / OFFLINE_QUEUE_MAX, 4),
            },
            "human_audits_pending": len(audit_log),
            "resilience_score":     self._score(breaker_status, queue_size, len(audit_log)),
            "checked_at":           int(time.time()),
        }

    def record_evaluation_outcome(self, approved: bool, score: float, event_id: str):
        """Record evaluation for circuit breaker monitoring."""
        self.breaker.record_evaluation(approved, score, event_id)

    def check_circuit_breaker(self) -> dict:
        return self.breaker.check_and_trip()

    def get_sdg_for_action(self, action_type: str) -> dict:
        sdgs = get_sdg_alignment(action_type)
        return {
            "action_type": action_type,
            "sdg_goals":   sdgs,
            "sdg_count":   len(sdgs),
        }

    @staticmethod
    def _score(breaker: dict, queue_size: int, audits: int) -> str:
        if breaker.get("tripped"):
            return "degraded"
        if queue_size > OFFLINE_QUEUE_MAX * 0.8:
            return "under_pressure"
        if audits > 5:
            return "monitoring_required"
        return "healthy"
