"""
HAVEN HUMANITY — Macro Economy Flywheel Engine
===============================================
LAYER 7 — MACROECONOMICS & REAL-WORLD IMPACT

Architecture Bible:
    "Setiap token yang beredar adalah bukti bahwa seseorang telah membantu."

Closed-Loop Economic Flywheel:
    Real Action → HAVEN earned → 3 possible uses:
        A) Donasi ke Crisis Fund → BURN → deflation → nilai HAVEN naik
        B) Bayar gas fee → circulates in HAVEN network economy
        C) Governance vote → locked temporarily → less circulating supply

Flywheel Cycle (4 steps):
    1. Action      : Volunteer melakukan kebaikan nyata
    2. Earn        : HAVEN Oracle mint HAVEN sesuai impact score
    3. Deploy      : HAVEN dipakai (donate/hold/vote/transfer)
    4. Reflex      : Setiap penggunaan meningkatkan demand → nilai naik

Triple Velocity Engine:
    v_circulation : token bergerak cepat = ekonomi sehat
    v_donation    : token dibakar untuk kebaikan = deflationary
    v_governance  : token dikunci untuk voting = reduced supply
"""

from __future__ import annotations

import json
import logging
import math
import time
from dataclasses import dataclass, field
from typing import Optional, List

logger = logging.getLogger("satin.flywheel")


# ── Config ──────────────────────────────────────────────────────────────────────
FLYWHEEL_HISTORY_WINDOW = 30 * 24 * 3600   # 30 days history for velocity calc
MAX_BURN_EVENTS_TRACKED = 10000


# ══════════════════════════════════════════════════════════════════════════════
# BURN TRACKER
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class BurnEvent:
    event_id:     str
    donor_addr:   str
    amount_haven:  float    # tokens burned
    target_sdg:   Optional[int]   # UN SDG goal this donation targets
    timestamp:    float

    def to_dict(self) -> dict:
        return {
            "event_id":    self.event_id,
            "donor_addr":  self.donor_addr,
            "amount_haven": round(self.amount_haven, 4),
            "target_sdg":  self.target_sdg,
            "timestamp":   int(self.timestamp),
        }


class BurnTracker:
    """Tracks token burn events for deflation monitoring."""

    def __init__(self, redis_client):
        self._r = redis_client

    def _key(self) -> str:
        return "satin:flywheel:burn_events"

    def _total_key(self) -> str:
        return "satin:flywheel:total_burned"

    def record_burn(self, donation: BurnEvent):
        """Record a token burn from a donation."""
        self._r.lpush(self._key(), json.dumps(donation.to_dict()))
        self._r.ltrim(self._key(), 0, MAX_BURN_EVENTS_TRACKED - 1)
        # Accumulate total
        self._r.incrbyfloat(self._total_key(), donation.amount_haven)
        logger.info(
            f"[Flywheel] Burn recorded: {donation.amount_haven:.2f} HAVEN "
            f"by {donation.donor_addr} → SDG {donation.target_sdg}"
        )

    def get_total_burned(self) -> float:
        total = self._r.get(self._total_key())
        return float(total) if total else 0.0

    def get_recent_burns(self, limit: int = 50) -> List[dict]:
        raw_list = self._r.lrange(self._key(), 0, limit - 1) or []
        result = []
        for raw in raw_list:
            try:
                result.append(json.loads(raw))
            except Exception:
                pass
        return result

    def get_burn_rate_30d(self) -> float:
        """Average HAVEN burned per day over the last 30 days."""
        burns = self.get_recent_burns(limit=MAX_BURN_EVENTS_TRACKED)
        cutoff = time.time() - FLYWHEEL_HISTORY_WINDOW
        recent = [b for b in burns if b.get("timestamp", 0) >= cutoff]
        if not recent:
            return 0.0
        total = sum(b.get("amount_haven", 0) for b in recent)
        return round(total / 30, 4)


# ══════════════════════════════════════════════════════════════════════════════
# VELOCITY TRACKER
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class VelocitySnapshot:
    """Snapshot of token velocity across 3 channels."""
    circulation_velocity: float  # transactions/day (all chain activity)
    donation_velocity:    float  # HAVEN burned/day (donations)
    governance_velocity:  float  # HAVEN locked in governance/day

    @property
    def flywheel_health(self) -> str:
        """Qualitative flywheel health from velocity metrics."""
        if self.donation_velocity > self.circulation_velocity * 0.2:
            return "strong_deflation"   # >20% flowing to burn → very bullish
        if self.governance_velocity > self.circulation_velocity * 0.1:
            return "governance_engaged"  # >10% staked in governance
        if self.circulation_velocity > 1000:
            return "high_circulation"    # lots of transaction activity
        return "early_stage"

    def to_dict(self) -> dict:
        return {
            "circulation_velocity": round(self.circulation_velocity, 4),
            "donation_velocity":    round(self.donation_velocity, 4),
            "governance_velocity":  round(self.governance_velocity, 4),
            "flywheel_health":      self.flywheel_health,
        }


# ══════════════════════════════════════════════════════════════════════════════
# FLYWHEEL STATE
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class FlywheelState:
    total_minted:          float
    total_burned:          float
    total_donated:         float
    circulating_supply:    float
    deflation_pct:         float    # burned / minted × 100
    burn_rate_30d:         float    # HAVEN burned per day
    velocity:              VelocitySnapshot
    recent_burns:          List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "total_minted":       round(self.total_minted, 4),
            "total_burned":       round(self.total_burned, 4),
            "total_donated":      round(self.total_donated, 4),
            "circulating_supply": round(self.circulating_supply, 4),
            "deflation_pct":      round(self.deflation_pct, 4),
            "burn_rate_30d":      round(self.burn_rate_30d, 4),
            "velocity":           self.velocity.to_dict(),
            "recent_burns":       self.recent_burns[:10],
            "generated_at":       int(time.time()),
        }


# ══════════════════════════════════════════════════════════════════════════════
# FLYWHEEL ENGINE (main interface)
# ══════════════════════════════════════════════════════════════════════════════

class FlywheelEngine:
    """
    Master Layer 7 Macro Economy Flywheel interface.
    Tracks the full HAVEN token lifecycle from mint→earn→spend→burn.
    """

    def __init__(self, redis_client):
        self._r            = redis_client
        self._burn_tracker = BurnTracker(redis_client)

    # ── Keys ────────────────────────────────────────────────────────────────────
    def _total_minted_key(self) -> str:
        return "satin:flywheel:total_minted"

    def _total_donated_key(self) -> str:
        return "satin:flywheel:total_donated"

    def _velocity_key(self) -> str:
        return "satin:flywheel:velocity_snapshot"

    # ── Record Events ────────────────────────────────────────────────────────────

    def record_mint(self, amount_haven: float, event_id: str):
        """Called by oracle after each successful verification."""
        self._r.incrbyfloat(self._total_minted_key(), amount_haven)
        logger.debug(f"[Flywheel] Mint +{amount_haven:.4f} HAVEN for event {event_id}")

    def record_donation_burn(
        self,
        donor_addr:  str,
        amount_haven: float,
        target_sdg:  Optional[int] = None,
        event_id:    Optional[str] = None,
    ) -> dict:
        """Record a donation that burns HAVEN tokens."""
        import uuid
        burn_event = BurnEvent(
            event_id    = event_id or str(uuid.uuid4()),
            donor_addr  = donor_addr.lower(),
            amount_haven = amount_haven,
            target_sdg  = target_sdg,
            timestamp   = time.time(),
        )
        self._burn_tracker.record_burn(burn_event)
        self._r.incrbyfloat(self._total_donated_key(), amount_haven)

        # Reflex bonus: 5% returned to donor (via oracle signature)
        reflex = round(amount_haven * 0.05, 6)
        return {
            "burned":              True,
            "amount_burned":       round(amount_haven, 4),
            "reflex_bonus_earned": reflex,
            "target_sdg":          target_sdg,
        }

    # ── Read State ───────────────────────────────────────────────────────────────

    def get_flywheel_state(self) -> FlywheelState:
        """Get current flywheel snapshot."""
        total_minted  = float(self._r.get(self._total_minted_key()) or 0)
        total_burned  = self._burn_tracker.get_total_burned()
        total_donated = float(self._r.get(self._total_donated_key()) or 0)
        circulating   = max(0.0, total_minted - total_burned)
        deflation_pct = (total_burned / total_minted * 100) if total_minted > 0 else 0.0
        burn_rate_30d = self._burn_tracker.get_burn_rate_30d()

        # Velocity estimates (in production: pull from on-chain data)
        velocity = self._estimate_velocity(burn_rate_30d, total_minted)
        recent   = self._burn_tracker.get_recent_burns(limit=10)

        return FlywheelState(
            total_minted       = total_minted,
            total_burned       = total_burned,
            total_donated      = total_donated,
            circulating_supply = circulating,
            deflation_pct      = deflation_pct,
            burn_rate_30d      = burn_rate_30d,
            velocity           = velocity,
            recent_burns       = recent,
        )

    def _estimate_velocity(self, burn_rate_30d: float, total_minted: float) -> VelocitySnapshot:
        """Estimate velocity metrics from available data."""
        # In production: query The Graph subgraph for on-chain velocity metrics
        # For now: estimates based on burn activity
        circulation_estimate = max(1.0, burn_rate_30d * 10)   # rough estimate
        governance_estimate  = max(0.0, burn_rate_30d * 0.5)

        return VelocitySnapshot(
            circulation_velocity = circulation_estimate,
            donation_velocity    = burn_rate_30d,
            governance_velocity  = governance_estimate,
        )
