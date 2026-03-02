"""
APEX HUMANITY — Cross-Temporal Evidence Chaining
=================================================
Lapisan 3 (GC-03): Cross-Temporal Evidence Chaining — Rantai Bukti Berkesinambungan

Konsep: Setiap submission bisa me-reference event sebelumnya dari volunteer yang
sama. Sistem membangun "impact thread" yang menunjukkan keberlangsungan sebuah
proyek. Proyek jangka panjang mendapat reward yang tumbuh bersama commitment-nya.

"Tidak ada lagi 'hit-and-run PoBA'. Volunteer yang punya thread panjang
mendapat penghargaan yang tidak bisa difake."

Formula Bonus:
    chain_bonus = min(MAX_CHAIN_BONUS, CHAIN_STEP_BONUS × chain_length)
    Total capped at 30% bonus

On-chain: chain ancestry diverifikasi via event_hash dari parent event yang
sudah on-chain. Off-chain: Redis menyimpan event_id → parent mapping.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Optional

logger = logging.getLogger("satin.chain")

# ── Config ─────────────────────────────────────────────────────────────────────
CHAIN_STEP_BONUS     = 0.05    # +5% per valid link in chain
MAX_CHAIN_BONUS      = 0.30    # cap at +30% (chain_length = 6)
MAX_CHAIN_DEPTH      = 10      # max depth to traverse (prevent cycles)
CHAIN_EXPIRE_DAYS    = 180     # events older than 180 days can't be chained
SAME_ACTION_BONUS    = 0.02    # extra +2% if parent has same action_type (consistency reward)


class ChainResult:
    def __init__(self):
        self.chain_length:   int   = 0
        self.bonus:          float = 0.0
        self.parent_valid:   bool  = False
        self.chain_events:   list[str] = []
        self.reason:         str   = ""

    def to_dict(self) -> dict:
        return {
            "chain_length":    self.chain_length,
            "chain_bonus":     round(self.bonus, 4),
            "parent_valid":    self.parent_valid,
            "chain_events":    self.chain_events,
        }


class CrossTemporalChain:
    """
    Manages evidence chaining between related submissions.

    Usage:
        chain = CrossTemporalChain(redis_client)
        result = chain.evaluate(
            volunteer_address = "0x...",
            parent_event_id   = "...",  # from request body
            action_type       = "SHELTER_CONSTRUCTION",
        )
        if result.parent_valid:
            apply_bonus(result.bonus)
        chain.register(event_id, volunteer_address, action_type, parent_event_id)
    """

    def __init__(self, redis_client):
        self._redis = redis_client

    # ─────────────────────────────────────────────────────────────────────────
    def evaluate(
        self,
        volunteer_address: str,
        parent_event_id:   Optional[str],
        action_type:       str,
    ) -> ChainResult:
        """
        Validates the chain and returns the bonus multiplier additive.
        """
        result = ChainResult()

        if not parent_event_id or parent_event_id.strip() == "":
            result.reason = "no_parent_specified"
            return result

        addr = volunteer_address.lower()
        chain_length, chain_events = self._traverse_chain(addr, parent_event_id, action_type)

        if chain_length == 0:
            result.reason = "parent_not_found_or_invalid"
            return result

        result.chain_length  = chain_length
        result.parent_valid  = True
        result.chain_events  = chain_events

        # Base bonus
        base_bonus = min(MAX_CHAIN_BONUS, CHAIN_STEP_BONUS * chain_length)

        # Same-action-type consistency bonus
        parent_action = self._get_parent_action(parent_event_id)
        if parent_action and parent_action.upper() == action_type.upper():
            same_action_extra = min(SAME_ACTION_BONUS * chain_length, 0.06)
            base_bonus = min(MAX_CHAIN_BONUS, base_bonus + same_action_extra)

        result.bonus = base_bonus
        result.reason = f"valid_chain_length_{chain_length}"

        logger.info(
            f"[ChainEval] {addr} chain_length={chain_length} "
            f"bonus=+{result.bonus:.0%} events={result.chain_events[:3]}"
        )

        return result

    # ─────────────────────────────────────────────────────────────────────────
    def register(
        self,
        event_id:          str,
        volunteer_address: str,
        action_type:       str,
        parent_event_id:   Optional[str] = None,
    ):
        """
        Register a new event in the chain store after successful verification.
        """
        addr = volunteer_address.lower()
        key  = f"satin:chain:event:{event_id}"
        data = {
            "event_id":        event_id,
            "volunteer":       addr,
            "action_type":     action_type,
            "parent_event_id": parent_event_id,
            "created_at":      int(time.time()),
        }
        # Store event, expire after CHAIN_EXPIRE_DAYS
        self._redis.setex(key, CHAIN_EXPIRE_DAYS * 86400, json.dumps(data))

        # Index: volunteer → list of their event IDs
        index_key = f"satin:chain:volunteer:{addr}"
        self._redis.lpush(index_key, event_id)
        self._redis.ltrim(index_key, 0, 49)   # keep last 50 events
        self._redis.expire(index_key, CHAIN_EXPIRE_DAYS * 86400)

        logger.info(f"[Chain] Registered: {event_id} (parent={parent_event_id})")

    # ─────────────────────────────────────────────────────────────────────────
    def _traverse_chain(
        self,
        volunteer_addr: str,
        start_event_id: str,
        action_type:    str,
        depth:          int = 0,
    ) -> tuple[int, list[str]]:
        """
        Traverse the chain starting from start_event_id.
        Returns (chain_length, list_of_event_ids).
        Only counts if the chain belongs to the SAME volunteer.
        """
        if depth >= MAX_CHAIN_DEPTH:
            return 0, []

        key  = f"satin:chain:event:{start_event_id}"
        raw  = self._redis.get(key)
        if not raw:
            return 0, []

        try:
            data = json.loads(raw)
        except Exception:
            return 0, []

        # Security: chain must belong to the same volunteer
        if data.get("volunteer", "").lower() != volunteer_addr:
            logger.warning(
                f"[Chain] SECURITY: Event {start_event_id} belongs to "
                f"{data.get('volunteer')} not {volunteer_addr}. Chain denied."
            )
            return 0, []

        # Check age
        created_at = data.get("created_at", 0)
        if time.time() - created_at > CHAIN_EXPIRE_DAYS * 86400:
            return 0, []

        parent = data.get("parent_event_id")
        if parent:
            sub_len, sub_events = self._traverse_chain(
                volunteer_addr, parent, action_type, depth + 1
            )
            return 1 + sub_len, [start_event_id] + sub_events
        else:
            return 1, [start_event_id]

    def _get_parent_action(self, parent_event_id: str) -> Optional[str]:
        key = f"satin:chain:event:{parent_event_id}"
        raw = self._redis.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw).get("action_type")
        except Exception:
            return None

    def get_volunteer_chain(self, volunteer_address: str) -> list[dict]:
        """Get all registered events for a volunteer (for frontend display)."""
        addr = volunteer_address.lower()
        index_key = f"satin:chain:volunteer:{addr}"
        event_ids = self._redis.lrange(index_key, 0, -1)
        events = []
        for eid in event_ids:
            raw = self._redis.get(f"satin:chain:event:{eid}")
            if raw:
                try:
                    events.append(json.loads(raw))
                except Exception:
                    pass
        return sorted(events, key=lambda e: e.get("created_at", 0), reverse=True)
