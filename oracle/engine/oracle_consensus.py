"""
APEX HUMANITY — Sovereign Oracle Network (SON) Consensus
==========================================================
LAYER 5 — DECENTRALIZED ORACLE NETWORK (SON)

Architecture Bible:
    "Oracle adalah suara bumi — tidak boleh menjadi sumber kebijakan."

Multi-Node Consensus:
    - Multiple oracle nodes submit independent scores for the same event
    - Consensus via IQR-trimmed mean (eliminates outliers)
    - Minimum quorum of 3 nodes required
    - Outlier nodes (outside 1.5×IQR) are flagged and slashed

Slash Mechanism:
    - Outlier count tracked per node
    - 3 outlier events → node slashed (reputation reduced)
    - 5 outlier events → node removed from network

Node Tiers:
    CANDIDATE → ACTIVE → TRUSTED → SENIOR
"""

from __future__ import annotations

import json
import logging
import math
import statistics
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional, List, Tuple

logger = logging.getLogger("satin.oracle_consensus")


# ── Config ──────────────────────────────────────────────────────────────────────
QUORUM_MIN          = 3      # minimum nodes to run consensus
IQR_FENCE_FACTOR    = 1.5    # Tukey fence multiplier
SLASH_WARN_LIMIT    = 3      # outlier count before warning
SLASH_REMOVE_LIMIT  = 5      # outlier count before removal
NODE_TTL_DAYS       = 90     # node record TTL in Redis
SCORE_SUBMIT_TTL    = 3600   # individual score submission TTL (1 hour)


# ══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class OracleNode:
    node_id:        str
    wallet_address: str
    stake_apex:     float   # tokens staked as bond
    tier:           str     = "candidate"  # candidate|active|trusted|senior
    outlier_count:  int     = 0
    total_scores:   int     = 0
    joined_at:      float   = field(default_factory=time.time)
    last_active:    float   = field(default_factory=time.time)
    slashed:        bool    = False

    def to_dict(self) -> dict:
        return {
            "node_id":        self.node_id,
            "wallet_address": self.wallet_address,
            "stake_apex":     round(self.stake_apex, 4),
            "tier":           self.tier,
            "outlier_count":  self.outlier_count,
            "total_scores":   self.total_scores,
            "reliability":    round(max(0, 1.0 - self.outlier_count / max(1, self.total_scores)), 4),
            "joined_at":      int(self.joined_at),
            "slashed":        self.slashed,
        }


@dataclass
class ConsensusResult:
    event_id:          str
    consensus_score:   float    # IQR-trimmed mean
    node_count:        int
    participated_nodes: List[str]
    outlier_nodes:     List[str]
    raw_scores:        List[float]
    quorum_met:        bool
    computed_at:       float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "event_id":          self.event_id,
            "consensus_score":   round(self.consensus_score, 4),
            "node_count":        self.node_count,
            "participated_nodes":self.participated_nodes,
            "outlier_nodes":     self.outlier_nodes,
            "raw_scores":        [round(s, 4) for s in self.raw_scores],
            "quorum_met":        self.quorum_met,
            "computed_at":       int(self.computed_at),
        }


# ══════════════════════════════════════════════════════════════════════════════
# CONSENSUS ALGORITHM
# ══════════════════════════════════════════════════════════════════════════════

def iqr_trimmed_mean(scores: List[float]) -> Tuple[float, List[int]]:
    """
    Returns (trimmed_mean, list_of_outlier_indices).
    Uses Tukey fences: Q1 - 1.5×IQR, Q3 + 1.5×IQR.
    Falls back to plain mean if too few data points.
    """
    if len(scores) < 4:
        return statistics.mean(scores), []

    sorted_s = sorted(scores)
    n = len(sorted_s)
    q1 = statistics.median(sorted_s[:n // 2])
    q3 = statistics.median(sorted_s[n // 2 + (n % 2):])
    iqr = q3 - q1

    lower = q1 - IQR_FENCE_FACTOR * iqr
    upper = q3 + IQR_FENCE_FACTOR * iqr

    valid   = [s for s in scores if lower <= s <= upper]
    outlier_idx = [i for i, s in enumerate(scores) if s < lower or s > upper]

    mean = statistics.mean(valid) if valid else statistics.mean(scores)
    return round(mean, 6), outlier_idx


# ══════════════════════════════════════════════════════════════════════════════
# NODE REGISTRY (Redis-backed)
# ══════════════════════════════════════════════════════════════════════════════

class OracleNodeRegistry:
    def __init__(self, redis_client):
        self._r = redis_client

    def _node_key(self, node_id: str) -> str:
        return f"satin:son:node:{node_id}"

    def _index_key(self) -> str:
        return "satin:son:nodes_index"

    def register(self, wallet: str, stake_apex: float) -> OracleNode:
        """Register a new oracle node."""
        node = OracleNode(
            node_id        = str(uuid.uuid4()),
            wallet_address = wallet.lower(),
            stake_apex     = stake_apex,
        )
        self._save_node(node)
        logger.info(f"[SON] Node registered: {node.node_id} wallet={wallet}")
        return node

    def get_node(self, node_id: str) -> Optional[OracleNode]:
        raw = self._r.get(self._node_key(node_id))
        if not raw:
            return None
        try:
            d = json.loads(raw)
            return OracleNode(**d)
        except Exception:
            return None

    def get_active_nodes(self) -> List[OracleNode]:
        ids = self._r.smembers(self._index_key()) or []
        nodes = []
        for nid in ids:
            n = self.get_node(nid)
            if n and not n.slashed and n.tier in ("active", "trusted", "senior"):
                nodes.append(n)
        return nodes

    def slash_node(self, node_id: str) -> str:
        """Increment outlier count; slash/remove if limits exceeded."""
        n = self.get_node(node_id)
        if not n:
            return "not_found"
        n.outlier_count += 1
        n.total_scores  = max(n.total_scores, n.outlier_count)

        if n.outlier_count >= SLASH_REMOVE_LIMIT:
            n.slashed = True
            n.tier    = "removed"
            status    = "removed"
        elif n.outlier_count >= SLASH_WARN_LIMIT:
            n.tier = "candidate"   # demoted
            status = "warned"
        else:
            status = "outlier_logged"

        self._save_node(n)
        logger.warning(f"[SON] Node {node_id} slash_status={status} outliers={n.outlier_count}")
        return status

    def _save_node(self, n: OracleNode):
        data = json.dumps({
            "node_id":        n.node_id,
            "wallet_address": n.wallet_address,
            "stake_apex":     n.stake_apex,
            "tier":           n.tier,
            "outlier_count":  n.outlier_count,
            "total_scores":   n.total_scores,
            "joined_at":      n.joined_at,
            "last_active":    n.last_active,
            "slashed":        n.slashed,
        })
        self._r.setex(self._node_key(n.node_id), NODE_TTL_DAYS * 86400, data)
        self._r.sadd(self._index_key(), n.node_id)


# ══════════════════════════════════════════════════════════════════════════════
# SCORE SUBMISSION & CONSENSUS
# ══════════════════════════════════════════════════════════════════════════════

class OracleConsensus:
    """
    Multi-node consensus manager.
    In production: all oracle nodes independently run SATIN evaluator
    and submit scores. Consensus is computed from IQR-trimmed mean.
    """

    def __init__(self, redis_client):
        self._r        = redis_client
        self._registry = OracleNodeRegistry(redis_client)

    def _scores_key(self, event_id: str) -> str:
        return f"satin:son:scores:{event_id}"

    def submit_score(
        self,
        event_id:    str,
        node_id:     str,
        score:       float,
        action_type: str,
    ) -> dict:
        """Oracle node submits its independent score for an event."""
        n = self._registry.get_node(node_id)
        if not n:
            raise ValueError(f"Node {node_id} not registered.")
        if n.slashed:
            raise ValueError(f"Node {node_id} is slashed and cannot submit.")

        # Update node last_active
        n.last_active = time.time()
        n.total_scores += 1
        self._registry._save_node(n)

        # Store score
        scores_key = self._scores_key(event_id)
        entry = json.dumps({"node_id": node_id, "score": score, "ts": time.time()})
        self._r.lpush(scores_key, entry)
        self._r.expire(scores_key, SCORE_SUBMIT_TTL)

        logger.info(f"[SON] Score submitted: event={event_id} node={node_id} score={score:.4f}")
        return {"submitted": True, "event_id": event_id, "node_id": node_id}

    def get_consensus(self, event_id: str) -> ConsensusResult:
        """Compute consensus from all submitted scores for an event."""
        raw_list = self._r.lrange(self._scores_key(event_id), 0, -1) or []
        entries  = []
        for raw in raw_list:
            try:
                entries.append(json.loads(raw))
            except Exception:
                pass

        quorum_met = len(entries) >= QUORUM_MIN
        if not entries:
            return ConsensusResult(
                event_id=event_id, consensus_score=0.0, node_count=0,
                participated_nodes=[], outlier_nodes=[], raw_scores=[],
                quorum_met=False,
            )

        scores   = [e["score"] for e in entries]
        node_ids = [e["node_id"] for e in entries]

        consensus_score, outlier_idx = iqr_trimmed_mean(scores)
        outlier_nodes = [node_ids[i] for i in outlier_idx]

        # Slash outlier nodes
        for nid in outlier_nodes:
            self._registry.slash_node(nid)

        return ConsensusResult(
            event_id           = event_id,
            consensus_score    = consensus_score,
            node_count         = len(entries),
            participated_nodes = node_ids,
            outlier_nodes      = outlier_nodes,
            raw_scores         = scores,
            quorum_met         = quorum_met,
        )

    def get_network_status(self) -> dict:
        active_nodes = self._registry.get_active_nodes()
        return {
            "active_node_count": len(active_nodes),
            "quorum_min":        QUORUM_MIN,
            "quorum_met":        len(active_nodes) >= QUORUM_MIN,
            "nodes":             [n.to_dict() for n in active_nodes],
        }

    def register_node(self, wallet: str, stake_apex: float) -> OracleNode:
        return self._registry.register(wallet, stake_apex)
