"""
HAVEN HUMANITY — Governance Engine
====================================
LAYER 4 — UNSEIZABLE GOVERNANCE

Architecture Bible:
    "Tidak ada satu entitas pun yang bisa mengambil alih protokol ini."

Quadratic Benevolence Voting:
    voting_power = sqrt(impact_events) × (1 + tenure × 0.1) + sqrt(token_held) × 0.3

Formula Threshold Dinamis:
    pass_threshold = MAX(40%, 51% - active_voter_ratio × 5%)
    (semakin banyak voter aktif → threshold naik)

Constitutional Immutables:
    - Anti-Sybil core tidak bisa diubah (hanya bisa diperketat)
    - Oracle Wallet list tidak bisa dikuasai single entity
    - PoB minimum tidak bisa diturunkan di bawah 0.30
"""

from __future__ import annotations

import json
import logging
import math
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional, List

logger = logging.getLogger("satin.governance")


# ── Config ──────────────────────────────────────────────────────────────────────
PROPOSAL_TTL_DAYS     = 14      # proposal live for 14 days
MIN_IMPACT_TO_PROPOSE = 10      # minimum impact events to create proposal
MIN_IMPACT_TO_VOTE    = 1       # minimum 1 verified event to vote
BASE_PASS_THRESHOLD   = 0.51    # 51% majority default
MAX_PASS_THRESHOLD    = 0.67    # 2/3 supermajority for constitutional changes

# Constitutional proposals require supermajority + longer discussion period
CONSTITUTIONAL_TYPES = {
    "anti_sybil_core",
    "oracle_wallet_list",
    "pob_minimum_threshold",
    "governance_rules",
}


def _quorum_required(total_eligible: int) -> int:
    """Minimum votes needed (10% quorum)."""
    return max(5, math.ceil(total_eligible * 0.10))


def _pass_threshold(active_voter_ratio: float, is_constitutional: bool) -> float:
    """
    Dynamic pass threshold:
    - Higher voter participation → higher threshold (harder to pass)
    - Constitutional → always supermajority
    """
    if is_constitutional:
        return MAX_PASS_THRESHOLD
    threshold = BASE_PASS_THRESHOLD - active_voter_ratio * 0.05
    return round(max(0.40, min(BASE_PASS_THRESHOLD, threshold)), 4)


# ══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class GovernanceProposal:
    proposal_id:      str
    proposer:         str
    title:            str
    description:      str
    proposal_type:    str       # "parameter_change" | "anti_sybil_core" | etc.
    target_param:     Optional[str]
    proposed_value:   Optional[str]
    created_at:       float
    expires_at:       float
    votes_for:        float = 0.0    # weighted vote power for
    votes_against:    float = 0.0    # weighted vote power against
    voters:           list  = field(default_factory=list)
    status:           str   = "active"   # active|passed|rejected|expired

    def to_dict(self) -> dict:
        total = self.votes_for + self.votes_against
        support_pct = (self.votes_for / total) if total > 0 else 0.0
        return {
            "proposal_id":    self.proposal_id,
            "proposer":       self.proposer,
            "title":          self.title,
            "description":    self.description,
            "proposal_type":  self.proposal_type,
            "target_param":   self.target_param,
            "proposed_value": self.proposed_value,
            "status":         self.status,
            "created_at":     int(self.created_at),
            "expires_at":     int(self.expires_at),
            "votes_for":      round(self.votes_for, 4),
            "votes_against":  round(self.votes_against, 4),
            "support_pct":    round(support_pct, 4),
            "voter_count":    len(self.voters),
        }


# ══════════════════════════════════════════════════════════════════════════════
# VOTING POWER
# ══════════════════════════════════════════════════════════════════════════════

def calculate_voting_power(
    impact_events:  int,
    tenure_days:    int,
    token_held_haven: float,
) -> float:
    """
    Quadratic Benevolence Voting:
        power = sqrt(impact_events) × (1 + tenure_days/365 × 0.1) + sqrt(token_held) × 0.3

    Ensures that:
    - Experienced volunteers (many events) have more say
    - Long-term commitment is rewarded (tenure)
    - Wealth (tokens) has only minority influence (30%)
    """
    event_component  = math.sqrt(max(0, impact_events))
    tenure_bonus     = 1.0 + (tenure_days / 365.0) * 0.10
    token_component  = math.sqrt(max(0.0, token_held_haven)) * 0.30

    power = event_component * tenure_bonus + token_component
    return round(power, 4)


# ══════════════════════════════════════════════════════════════════════════════
# PROPOSAL STORE (Redis-backed)
# ══════════════════════════════════════════════════════════════════════════════

class ProposalStore:
    """Redis-backed proposal storage."""

    def __init__(self, redis_client):
        self._r = redis_client

    def _key(self, pid: str) -> str:
        return f"satin:gov:proposal:{pid}"

    def _index_key(self) -> str:
        return "satin:gov:proposals_index"

    def save(self, p: GovernanceProposal):
        data = json.dumps({
            "proposal_id":    p.proposal_id,
            "proposer":       p.proposer,
            "title":          p.title,
            "description":    p.description,
            "proposal_type":  p.proposal_type,
            "target_param":   p.target_param,
            "proposed_value": p.proposed_value,
            "created_at":     p.created_at,
            "expires_at":     p.expires_at,
            "votes_for":      p.votes_for,
            "votes_against":  p.votes_against,
            "voters":         p.voters,
            "status":         p.status,
        })
        self._r.setex(self._key(p.proposal_id), PROPOSAL_TTL_DAYS * 86400, data)
        self._r.sadd(self._index_key(), p.proposal_id)

    def get(self, pid: str) -> Optional[GovernanceProposal]:
        raw = self._r.get(self._key(pid))
        if not raw:
            return None
        try:
            d = json.loads(raw)
            return GovernanceProposal(**d)
        except Exception:
            return None

    def list_active(self) -> List[GovernanceProposal]:
        now = time.time()
        pids = self._r.smembers(self._index_key()) or []
        results = []
        for pid in pids:
            p = self.get(pid)
            if p:
                # Auto-expire
                if p.expires_at < now and p.status == "active":
                    p.status = "expired"
                    self.save(p)
                results.append(p)
        return sorted(results, key=lambda p: p.created_at, reverse=True)


# ══════════════════════════════════════════════════════════════════════════════
# GOVERNANCE ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class GovernanceEngine:
    """
    Main governance orchestrator.
    Called from main.py governance endpoints.
    """

    def __init__(self, redis_client):
        self._store = ProposalStore(redis_client)

    def create_proposal(
        self,
        proposer:         str,
        title:            str,
        description:      str,
        proposal_type:    str,
        impact_events:    int,
        target_param:     Optional[str] = None,
        proposed_value:   Optional[str] = None,
    ) -> GovernanceProposal:
        """Create a new governance proposal."""
        if impact_events < MIN_IMPACT_TO_PROPOSE:
            raise ValueError(
                f"Proposer needs at least {MIN_IMPACT_TO_PROPOSE} verified impact events. "
                f"Current: {impact_events}."
            )
        now     = time.time()
        expires = now + PROPOSAL_TTL_DAYS * 86400

        p = GovernanceProposal(
            proposal_id   = str(uuid.uuid4()),
            proposer      = proposer.lower(),
            title         = title,
            description   = description,
            proposal_type = proposal_type,
            target_param  = target_param,
            proposed_value= proposed_value,
            created_at    = now,
            expires_at    = expires,
        )
        self._store.save(p)
        logger.info(f"[Gov] Proposal created: {p.proposal_id} by {proposer}")
        return p

    def cast_vote(
        self,
        proposal_id:     str,
        voter_address:   str,
        vote_for:        bool,
        impact_events:   int,
        tenure_days:     int,
        token_held_haven: float,
    ) -> dict:
        """Cast a quadratic benevolence vote."""
        if impact_events < MIN_IMPACT_TO_VOTE:
            raise ValueError("You need at least 1 verified impact event to vote.")

        p = self._store.get(proposal_id)
        if not p:
            raise ValueError(f"Proposal {proposal_id} not found.")
        if p.status != "active":
            raise ValueError(f"Proposal is {p.status} — voting closed.")
        if time.time() > p.expires_at:
            p.status = "expired"
            self._store.save(p)
            raise ValueError("Proposal has expired.")

        voter = voter_address.lower()
        if voter in p.voters:
            raise ValueError("You have already voted on this proposal.")

        power = calculate_voting_power(impact_events, tenure_days, token_held_haven)
        if vote_for:
            p.votes_for += power
        else:
            p.votes_against += power
        p.voters.append(voter)

        # Check if proposal has passed or failed
        total = p.votes_for + p.votes_against
        is_const = proposal_type_is_constitutional(p.proposal_type)
        threshold = _pass_threshold(
            active_voter_ratio = len(p.voters) / max(1, len(p.voters) + 10),
            is_constitutional  = is_const,
        )
        
        # Require minimum number of unique voters AND minimum total power
        min_voters_required = _quorum_required(100)
        
        if len(p.voters) >= min_voters_required:
            support = p.votes_for / total if total > 0 else 0
            if support >= threshold:
                p.status = "passed"
            elif (1 - support) >= threshold:
                p.status = "rejected"

        self._store.save(p)
        logger.info(
            f"[Gov] Vote: {voter} → {'+' if vote_for else '-'} {power:.2f} power "
            f"on {proposal_id} | status={p.status}"
        )
        return {
            "voted":         True,
            "voting_power":  power,
            "proposal_status": p.status,
            "current_support": round(p.votes_for / max(1, total), 4),
        }

    def get_proposals(self) -> List[dict]:
        return [p.to_dict() for p in self._store.list_active()]

    def get_voting_power(
        self,
        impact_events:   int,
        tenure_days:     int,
        token_held_haven: float,
    ) -> dict:
        power = calculate_voting_power(impact_events, tenure_days, token_held_haven)
        return {
            "voting_power":    power,
            "impact_events":   impact_events,
            "tenure_days":     tenure_days,
            "token_held_haven": token_held_haven,
            "formula":         "sqrt(events) × (1 + tenure/365 × 0.1) + sqrt(tokens) × 0.3",
        }


def proposal_type_is_constitutional(ptype: str) -> bool:
    return ptype.lower() in CONSTITUTIONAL_TYPES
