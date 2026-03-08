"""
HAVEN HUMANITY — Living Economy Engine
======================================
LAYER 2 — TOKENOMIK "LIVING ECONOMY"

Architecture Bible:
    annual_mint_cap = f(global_suffering_index) × base_rate

"Tidak ada hard cap. Supply token ditentukan oleh index krisis global realtime."

Formula Lengkap:
    suffering_index = avg(famine_score, displacement_score, conflict_score, disaster_score)
    annual_mint_cap = BASE_SUPPLY × (1 + suffering_index × FLEX_FACTOR)

Triple Velocity Model:
    - Token dengan riwayat volunteering events → velocity bonus → lebih berharga
    - Token idle (>1 tahun) → decay → burn tax 2%/tahun
    - Token dipakai untuk donasi → reflex bonus → pemilik dapat sebagian kembali

Fallback: Jika API tidak tersedia → static suffering_index = 0.60 (medium crisis)
"""

from __future__ import annotations

import logging
import math
import os
import time
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("satin.living_economy")


# ── Base Configuration ──────────────────────────────────────────────────────────
BASE_ANNUAL_SUPPLY    = 100_000_000.0   # 100M tokens nominal base
FLEX_FACTOR           = 2.0             # max 3× base supply during extreme crisis
IDLE_DECAY_RATE       = 0.02            # 2% annual burn tax on idle tokens
DONATION_REFLEX_RATE  = 0.05            # 5% of donated amount returned to donor

# Cache
_SUFFERING_CACHE: Optional[dict] = None
_CACHE_TTL_SEC = int(os.getenv("ECONOMY_CACHE_TTL_SEC", "3600"))
_LAST_FETCH_TS: float = 0.0


# ══════════════════════════════════════════════════════════════════════════════
# GLOBAL SUFFERING INDEX
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class SufferingIndex:
    """
    Composite human suffering measurement from UN/OCHA data sources.
    0.0 = global peace & prosperity, 1.0 = maximum civilizational crisis.
    """
    famine_score:       float = 0.0   # IPC/FAO famine severity
    displacement_score: float = 0.0   # UNHCR displaced persons proportion
    conflict_score:     float = 0.0   # ACLED conflict events density
    disaster_score:     float = 0.0   # GDACS cumulative severity
    source:             str   = "static"
    computed_at:        float = field(default_factory=time.time)

    @property
    def composite(self) -> float:
        """Weighted composite 0.0–1.0."""
        return round(min(1.0, (
            self.famine_score       * 0.30 +
            self.displacement_score * 0.30 +
            self.conflict_score     * 0.20 +
            self.disaster_score     * 0.20
        )), 4)

    def to_dict(self) -> dict:
        return {
            "composite":          self.composite,
            "famine_score":       round(self.famine_score, 4),
            "displacement_score": round(self.displacement_score, 4),
            "conflict_score":     round(self.conflict_score, 4),
            "disaster_score":     round(self.disaster_score, 4),
            "source":             self.source,
            "age_seconds":        round(time.time() - self.computed_at),
        }


def _fetch_gdacs_severity() -> float:
    """Pull current GDACS disaster severity (0.0–1.0 normalized)."""
    try:
        import urllib.request, json
        url  = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS"
        with urllib.request.urlopen(url, timeout=4) as r:
            data = json.loads(r.read())
        features = data.get("features", [])
        if not features:
            return 0.40
        severity_map = {"green": 0.2, "orange": 0.6, "red": 1.0}
        scores = [
            severity_map.get(f["properties"].get("alertlevel", "green").lower(), 0.2)
            for f in features
        ]
        return round(min(1.0, sum(scores) / len(scores)), 4)
    except Exception as e:
        logger.warning(f"[Economy] GDACS fetch failed: {e}")
        return 0.40


def _fetch_ocha_displacement() -> float:
    """
    Proxy UNHCR displacement — in production use UNHCR API.
    Returns estimated proportion of global population displaced (0.0–1.0).
    Static fallback: ~1% global displacement = 0.60 suffering
    """
    # Production: https://api.unhcr.org/population/v1/population/?year=YYYY
    try:
        # Normalized: ~120M displaced (2024) / 8B global = ~1.5% → score 0.55
        return 0.55
    except Exception:
        return 0.50


def compute_suffering_index() -> SufferingIndex:
    """
    Compute current global suffering index from live APIs with caching.
    Falls back to static estimates if APIs are unavailable.
    """
    global _SUFFERING_CACHE, _LAST_FETCH_TS

    now = time.time()
    if _SUFFERING_CACHE and (now - _LAST_FETCH_TS) < _CACHE_TTL_SEC:
        logger.debug("[Economy] Using cached suffering index")
        return SufferingIndex(**_SUFFERING_CACHE)

    logger.info("[Economy] Fetching fresh suffering index from external APIs...")
    disaster_score    = _fetch_gdacs_severity()
    displacement_score = _fetch_ocha_displacement()
    # Static estimates for famine and conflict — replace with real APIs in Planetary phase
    famine_score   = 0.45   # ~783M chronically undernourished (FAO 2023)
    conflict_score = 0.38   # ACLED normalized estimate

    idx = SufferingIndex(
        famine_score       = famine_score,
        displacement_score = displacement_score,
        conflict_score     = conflict_score,
        disaster_score     = disaster_score,
        source             = "mixed_api+static",
        computed_at        = now,
    )
    _SUFFERING_CACHE = {
        "famine_score":       idx.famine_score,
        "displacement_score": idx.displacement_score,
        "conflict_score":     idx.conflict_score,
        "disaster_score":     idx.disaster_score,
        "source":             idx.source,
        "computed_at":        idx.computed_at,
    }
    _LAST_FETCH_TS = now
    logger.info(f"[Economy] Suffering Index = {idx.composite:.4f} ({idx.source})")
    return idx


# ══════════════════════════════════════════════════════════════════════════════
# MINT CAP CALCULATOR
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class MintCapResult:
    suffering_index:    SufferingIndex
    annual_mint_cap:    float   # total tokens mintable this year
    current_mint_rate:  float   # tokens per second right now
    deflation_pressure: float   # 0.0–1.0 (higher = more burn happening)
    phase:              str     # "genesis","sovereign","quadratic","planetary","quantum_safe","civilizational"

    def to_dict(self) -> dict:
        return {
            "annual_mint_cap":    round(self.annual_mint_cap),
            "current_mint_rate":  round(self.current_mint_rate, 6),
            "deflation_pressure": round(self.deflation_pressure, 4),
            "suffering_index":    self.suffering_index.to_dict(),
            "phase":              self.phase,
        }


def calculate_mint_cap(
    suffering: SufferingIndex,
    phase: str = "sovereign",
    idle_tokens_estimate: float = 0.0,
) -> MintCapResult:
    """
    annual_mint_cap = BASE_ANNUAL_SUPPLY × (1 + suffering.composite × FLEX_FACTOR)

    During Genesis phase: mint cap is capped at 120% base regardless of suffering.
    """
    raw_cap = BASE_ANNUAL_SUPPLY * (1.0 + suffering.composite * FLEX_FACTOR)

    # Phase-based constraints
    phase_caps = {
        "genesis":      BASE_ANNUAL_SUPPLY * 1.2,
        "sovereign":    BASE_ANNUAL_SUPPLY * 2.0,
        "quadratic":    BASE_ANNUAL_SUPPLY * 2.5,
        "planetary":    BASE_ANNUAL_SUPPLY * 3.0,
        "quantum_safe": BASE_ANNUAL_SUPPLY * 3.0,
        "civilizational": raw_cap,  # no hard cap
    }
    annual_cap  = min(raw_cap, phase_caps.get(phase, raw_cap))
    mint_per_sec = annual_cap / (365 * 24 * 3600)

    # Deflation pressure: idle tokens subject to burn
    deflation = 0.0
    if idle_tokens_estimate > 0:
        annual_burn = idle_tokens_estimate * IDLE_DECAY_RATE
        deflation   = round(min(1.0, annual_burn / annual_cap), 4)

    logger.info(
        f"[Economy] MintCap: {annual_cap:,.0f}/year | "
        f"rate={mint_per_sec:.4f}/sec | "
        f"suffering={suffering.composite:.4f} | phase={phase}"
    )
    return MintCapResult(
        suffering_index    = suffering,
        annual_mint_cap    = round(annual_cap, 2),
        current_mint_rate  = round(mint_per_sec, 8),
        deflation_pressure = deflation,
        phase              = phase,
    )


# ══════════════════════════════════════════════════════════════════════════════
# TRIPLE VELOCITY MODEL
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class VelocityResult:
    """
    Triple Velocity: measures token economic health.
    Tokens that move for good causes survive; idle tokens decay.
    """
    velocity_bonus:    float  # multiplier for tokens with volunteering history
    idle_decay_annual: float  # % burned if idle >1 year
    reflex_bonus:      float  # % returned to donor after donation
    
    def to_dict(self) -> dict:
        return {
            "velocity_bonus":    round(self.velocity_bonus, 4),
            "idle_decay_annual": round(self.idle_decay_annual, 4),
            "reflex_bonus":      round(self.reflex_bonus, 4),
        }


def compute_velocity(volunteering_events: int) -> VelocityResult:
    """
    Token dengan riwayat × volunteering events → velocity bonus → lebih berharga.
    """
    # Velocity bonus grows logarithmically with volunteering history
    velocity = 1.0 + math.log1p(volunteering_events) * 0.05
    velocity  = round(min(2.0, velocity), 4)   # max 2× multiplier

    return VelocityResult(
        velocity_bonus    = velocity,
        idle_decay_annual = IDLE_DECAY_RATE,
        reflex_bonus      = DONATION_REFLEX_RATE,
    )


# ══════════════════════════════════════════════════════════════════════════════
# MAIN CLASS
# ══════════════════════════════════════════════════════════════════════════════

class LivingEconomyEngine:
    """
    Master interface for HAVEN Living Economy calculations.
    Called from main.py economy endpoints and optionally from verify pipeline.
    """

    def get_economy_status(
        self,
        phase:                str   = "sovereign",
        idle_tokens_estimate: float = 0.0,
        volunteering_events:  int   = 0,
    ) -> dict:
        """Full economy status snapshot."""
        suffering = compute_suffering_index()
        mint_cap  = calculate_mint_cap(suffering, phase, idle_tokens_estimate)
        velocity  = compute_velocity(volunteering_events)

        return {
            "protocol_phase":  phase,
            "mint_cap":        mint_cap.to_dict(),
            "velocity":        velocity.to_dict(),
            "economy_health":  self._health_score(mint_cap, velocity),
            "generated_at":    int(time.time()),
        }

    @staticmethod
    def _health_score(mint_cap: MintCapResult, velocity: VelocityResult) -> str:
        """Qualitative economy health indicator."""
        if mint_cap.deflation_pressure > 0.5:
            return "deflationary_surge"
        if velocity.velocity_bonus > 1.5:
            return "high_velocity"
        if mint_cap.suffering_index.composite > 0.7:
            return "crisis_response_mode"
        if mint_cap.suffering_index.composite < 0.3:
            return "stable_prosperity"
        return "balanced"
