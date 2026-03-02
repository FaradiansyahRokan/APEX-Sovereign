"""
APEX HUMANITY — Proof of Benevolence (PoB) Engine
===================================================
LAYER 1 — PROOF OF BENEVOLENCE (PoB)
Architecture Bible: PoB = PoPhysical × PoContext × PoNetwork

"Buktikan tindakan nyata bagi manusia."

Tiga komponen yang tidak bisa dipisahkan:
  PoPhysical  — Bukti fisik yang tidak bisa difabrikasi (GPS, accelerometer, ambient)
  PoContext   — AI multi-modal membaca konteks (CV + LLM + Crisis Feed)
  PoNetwork   — Validasi dari orang lain (witnesses, beneficiary sign, community trust)

Formula:
    PoB_score = (PoPhysical × 0.35) + (PoContext × 0.45) + (PoNetwork × 0.20)
    Multiplied with the base impact score from SATIN evaluator.
"""

from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass, field
from typing import Optional, List

logger = logging.getLogger("satin.pob")


# ── Configuration ──────────────────────────────────────────────────────────────
POB_WEIGHT_PHYSICAL = 0.35   # GPS + device signal
POB_WEIGHT_CONTEXT  = 0.45   # AI CV + LLM + crisis cross-ref
POB_WEIGHT_NETWORK  = 0.20   # witnesses + beneficiary sign

# Minimum PoB threshold for a "strong" proof
POB_STRONG_THRESHOLD = 0.60   # 60% aggregate = strong proof
POB_WEAK_THRESHOLD   = 0.30   # below 30% = suspicious


# ══════════════════════════════════════════════════════════════════════════════
# PHYSICAL PROOF (PoPhysical)
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class PoPhysicalResult:
    """
    Proof of Physical Presence — what a device attests about the moment.
    In production: accelerometer pattern + ambient audio fingerprint.
    Currently: GPS vector freshness + live capture bonus.
    """
    gps_valid:         bool  = False
    gps_accuracy_m:    float = 999.0   # lower = better
    live_capture:      bool  = False   # photo taken in-app vs gallery
    capture_age_min:   float = 9999.0  # minutes since photo was taken
    device_fp_present: bool  = False   # device fingerprint hash provided

    @property
    def score(self) -> float:
        """Returns 0.0–1.0 PoPhysical score."""
        s = 0.0
        if not self.gps_valid:
            return 0.0
        # GPS accuracy bonus (0–100m → full, degrades at 500m+)
        gps_bonus = max(0.0, 1.0 - (self.gps_accuracy_m / 500.0))
        s += gps_bonus * 0.40

        # Live capture is the strongest physical attestation
        if self.live_capture:
            s += 0.40
            # Freshness bonus (still live within 15 minutes)
            if self.capture_age_min <= 15:
                s += 0.10
        else:
            # Gallery photo — partial credit
            s += 0.15

        # Device fingerprint binding
        if self.device_fp_present:
            s += 0.10

        return round(min(1.0, s), 4)


def evaluate_physical(
    gps_valid:         bool,
    gps_accuracy_m:    float,
    source:            str,
    capture_timestamp: Optional[int],
    device_fingerprint: Optional[str],
) -> PoPhysicalResult:
    """Build PoPhysical result from submission metadata."""
    live  = (source == "live_capture")
    age_m = 9999.0
    if live and capture_timestamp:
        age_m = (time.time() * 1000 - capture_timestamp) / 60_000

    return PoPhysicalResult(
        gps_valid         = gps_valid,
        gps_accuracy_m    = gps_accuracy_m,
        live_capture      = live,
        capture_age_min   = age_m,
        device_fp_present = bool(device_fingerprint and len(device_fingerprint) >= 8),
    )


# ══════════════════════════════════════════════════════════════════════════════
# CONTEXT PROOF (PoContext)
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class PoContextResult:
    """
    Proof of Context — AI reads the situation, not just the image.
    Aggregates CV confidence, LLM verdict, and crisis zone correlation.
    """
    cv_confidence:   float = 0.0   # 0.0–1.0 from YOLO/CV verifier
    llm_verdict:     str   = "not_run"   # consistent|suspicious|fabricated|not_run
    in_crisis_zone:  bool  = False
    crisis_severity: float = 0.0   # 0.0–1.0

    @property
    def score(self) -> float:
        """Returns 0.0–1.0 PoContext score."""
        s = 0.0

        # CV confidence (most objective)
        s += self.cv_confidence * 0.50

        # LLM verdict
        llm_map = {
            "consistent": 0.40,
            "not_run":    0.20,   # neutral — no penalty without LLM key
            "suspicious": -0.10,
            "fabricated": -0.40,
        }
        s += llm_map.get(self.llm_verdict, 0.0)

        # Crisis zone correlation — being in-crisis boosts context validity
        if self.in_crisis_zone:
            s += 0.10 * self.crisis_severity

        return round(max(0.0, min(1.0, s)), 4)


def evaluate_context(
    cv_confidence: float,
    llm_verdict:   Optional[str],
    crisis_result: dict,
) -> PoContextResult:
    """Build PoContext from evaluator outputs."""
    return PoContextResult(
        cv_confidence  = cv_confidence,
        llm_verdict    = llm_verdict or "not_run",
        in_crisis_zone = crisis_result.get("in_crisis_zone", False),
        crisis_severity= crisis_result.get("crisis_severity", 0.0),
    )


# ══════════════════════════════════════════════════════════════════════════════
# NETWORK PROOF (PoNetwork)
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class PoNetworkResult:
    """
    Proof of Network — validation from people around the same event.
    Volunteer lain yang berdekatan GPS, beneficiary sign, community trust cluster.
    """
    witness_count:       int   = 0      # other volunteers who confirmed
    beneficiary_signed:  bool  = False  # recipient scanned QR and signed
    community_approved:  bool  = False  # community vote passed
    voucher_reputation:  float = 0.0    # avg reputation of vouchers (0–1.0)

    @property
    def score(self) -> float:
        """Returns 0.0–1.0 PoNetwork score."""
        s = 0.0

        # Witnesses from proximity GPS
        witness_bonus = min(0.40, self.witness_count * 0.10)
        s += witness_bonus

        # Beneficiary QR sign — strongest social proof
        if self.beneficiary_signed:
            s += 0.35

        # Community DAO approval
        if self.community_approved:
            s += 0.15

        # Voucher reputation bonus
        s += self.voucher_reputation * 0.10

        return round(min(1.0, s), 4)


def evaluate_network(
    witness_count:      int,
    beneficiary_signed: bool,
    community_approved: bool,
    voucher_reputation: float = 0.0,
) -> PoNetworkResult:
    """Build PoNetwork from social verification signals."""
    return PoNetworkResult(
        witness_count      = witness_count,
        beneficiary_signed = beneficiary_signed,
        community_approved = community_approved,
        voucher_reputation = max(0.0, min(1.0, voucher_reputation)),
    )


# ══════════════════════════════════════════════════════════════════════════════
# AGGREGATE — Final PoB Score
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class PoBResult:
    """Final aggregated Proof of Benevolence result."""
    physical:      PoPhysicalResult
    context:       PoContextResult
    network:       PoNetworkResult
    total_score:   float = 0.0
    strength:      str   = "weak"   # weak | moderate | strong

    def to_dict(self) -> dict:
        return {
            "pob_total":        round(self.total_score, 4),
            "pob_strength":     self.strength,
            "pob_physical":     round(self.physical.score, 4),
            "pob_context":      round(self.context.score, 4),
            "pob_network":      round(self.network.score, 4),
            "pob_breakdown": {
                "gps_valid":          self.physical.gps_valid,
                "live_capture":       self.physical.live_capture,
                "cv_confidence":      round(self.context.cv_confidence, 4),
                "llm_verdict":        self.context.llm_verdict,
                "in_crisis_zone":     self.context.in_crisis_zone,
                "witness_count":      self.network.witness_count,
                "beneficiary_signed": self.network.beneficiary_signed,
                "community_approved": self.network.community_approved,
            },
        }


class PoBEngine:
    """
    Master Proof of Benevolence aggregator.
    Called from main.py after all sub-checks complete.
    """

    def aggregate(
        self,
        physical: PoPhysicalResult,
        context:  PoContextResult,
        network:  PoNetworkResult,
    ) -> PoBResult:
        total = (
            physical.score * POB_WEIGHT_PHYSICAL
            + context.score  * POB_WEIGHT_CONTEXT
            + network.score  * POB_WEIGHT_NETWORK
        )
        total = round(min(1.0, max(0.0, total)), 4)

        if total >= POB_STRONG_THRESHOLD:
            strength = "strong"
        elif total >= POB_WEAK_THRESHOLD:
            strength = "moderate"
        else:
            strength = "weak"

        result = PoBResult(
            physical    = physical,
            context     = context,
            network     = network,
            total_score = total,
            strength    = strength,
        )

        logger.info(
            f"[PoB] total={total:.2%} ({strength}) | "
            f"physical={physical.score:.2%} context={context.score:.2%} network={network.score:.2%}"
        )
        return result
