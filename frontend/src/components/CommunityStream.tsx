"use client";

import { useState, useEffect, useCallback } from "react";
import { useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { pad } from "viem";
import { CONTRACTS, ACTION_TYPES, URGENCY_LEVELS, getRank } from "../utils/constants";
import { BENEVOLENCE_VAULT_ABI } from "../utils/abis";
import { ENV } from "../utils/env";
import { motion, AnimatePresence } from "framer-motion";

// ── ENV (synced with SubmitImpactForm.tsx v2.0) ───────────────────────────────
const ORACLE_URL = ENV.ORACLE_URL;
const ORACLE_KEY = ENV.HAVEN_ORACLE_KEY || "HAVEN_ROKAN_NJXBDSA_010011";
const POLL_MS = 15_000;

// ── Types (synced with backend v2.0 stream_entry + vote_info) ─────────────────
interface VoteInfo {
  approve: number;
  reject: number;
  total: number;
  outcome: string | null;
  phase: number;
  phase2_in: number;
  voters?: string[];
}

interface StreamEntry {
  event_id: string;
  volunteer_address: string;
  action_type: string;
  urgency_level: string;
  description: string;
  latitude: number;
  longitude: number;
  effort_hours: number;
  people_helped: number;
  impact_score: number;
  ai_confidence: number;
  token_reward: number;
  source: string;
  image_base64: string | null;
  integrity_warnings: string[];
  parameter_warnings?: string[];         // v2.0: from param_result.warnings
  llm_verdict?: string;           // v2.0: "consistent" | "suspicious" | "fabricated"
  llm_reason?: string;
  visual_description?: string;           // v2.0: Fase 1 — what AI saw
  claim_accuracy_score?: number;           // v2.0: Fase 2 — 0.0–1.0
  discrepancies?: string[];         // v2.0: Fase 2 — specific mismatches
  integrity_score?: number;           // v2.0: Fase 3 — overall
  phase1_scene_type?: string;           // v2.0: Fase 1 raw
  phase1_people_visible?: number;          // v2.0: Fase 1 raw
  phase1_activity?: string;           // v2.0: Fase 1 raw
  phase1_image_auth?: string;           // v2.0: Fase 1 raw
  needs_community_review: boolean;
  needs_champion_audit?: boolean;
  submitted_at: number;
  vote_info?: VoteInfo;
}

// ── Design tokens (on-theme, no emojis) ──────────────────────────────────────
const C = {
  teal: "#00dfb2",
  purple: "#7c6aff",
  pink: "#ff6eb4",
  amber: "#ffbd59",
  red: "#ff5050",
  dimText: "rgba(255,255,255,0.3)",
  faintBg: "rgba(255,255,255,0.025)",
  faintBd: "rgba(255,255,255,0.07)",
};

const glassCard: React.CSSProperties = {
  borderRadius: "16px",
  border: `1px solid ${C.faintBd}`,
  background: C.faintBg,
  overflow: "hidden",
};

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

const sans: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const capsLabel: React.CSSProperties = {
  ...mono,
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: C.dimText,
};

// ── Utility ───────────────────────────────────────────────────────────────────
function timeAgo(unix: number) {
  const s = Math.floor(Date.now() / 1000) - unix;
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Verdict color map ─────────────────────────────────────────────────────────
const verdictMeta: Record<string, { label: string; color: string; bg: string; bd: string }> = {
  consistent: { label: "CONSISTENT", color: C.teal, bg: "rgba(0,223,178,0.08)", bd: "rgba(0,223,178,0.25)" },
  suspicious: { label: "SUSPICIOUS", color: C.amber, bg: "rgba(255,189,89,0.08)", bd: "rgba(255,189,89,0.25)" },
  fabricated: { label: "FABRICATED", color: C.red, bg: "rgba(255,80,80,0.08)", bd: "rgba(255,80,80,0.25)" },
};

const authMeta: Record<string, { color: string; bg: string }> = {
  real_photo: { color: C.teal, bg: "rgba(0,223,178,0.08)" },
  likely_screenshot: { color: C.red, bg: "rgba(255,80,80,0.08)" },
  likely_digital_art: { color: C.red, bg: "rgba(255,80,80,0.08)" },
  possibly_manipulated: { color: C.amber, bg: "rgba(255,189,89,0.08)" },
  unclear: { color: C.dimText, bg: "rgba(255,255,255,0.04)" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({
  children, color, bg, bd,
}: { children: React.ReactNode; color: string; bg?: string; bd?: string }) {
  return (
    <span style={{
      ...mono,
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: "5px",
      fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color,
      background: bg ?? `${color}14`,
      border: `1px solid ${bd ?? `${color}44`}`,
      whiteSpace: "nowrap" as const,
    }}>
      {children}
    </span>
  );
}

function ActionBadge({ type }: { type: string }) {
  const a = ACTION_TYPES.find(x => x.value === type);
  return <Pill color={C.teal}>{a?.label ?? type.replace(/_/g, " ")}</Pill>;
}

function UrgencyBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    CRITICAL: C.purple,
    HIGH: C.pink,
    MEDIUM: C.amber,
    LOW: C.teal,
  };
  const c = map[level] ?? C.amber;
  return <Pill color={c}>{level}</Pill>;
}

/** Thin horizontal bar */
function Bar({
  value, color, height = 4,
}: { value: number; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(100, Math.max(0, value))}%`,
        borderRadius: 99, background: color,
        transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

function ConfidenceRow({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 60 ? C.teal : pct >= 30 ? C.amber : C.red;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={capsLabel}>AI Confidence</span>
        <span style={{ ...mono, fontSize: "11px", fontWeight: 700, color }}>{pct}%</span>
      </div>
      <Bar value={pct} color={color} />
    </div>
  );
}

// ── 3-Phase Cross-Examination Panel ──────────────────────────────────────────
function CrossExamPanel({ entry }: { entry: StreamEntry }) {
  const hasPhase1 = entry.visual_description || entry.phase1_scene_type;
  const hasPhase2 = entry.llm_verdict || entry.claim_accuracy_score !== undefined;
  const hasPhase3 = entry.integrity_score !== undefined;

  if (!hasPhase1 && !hasPhase2 && !hasPhase3) return null;

  const verdict = entry.llm_verdict ?? "suspicious";
  const vm = verdictMeta[verdict] ?? verdictMeta.suspicious;
  const acc = entry.claim_accuracy_score ?? 0.5;
  const accPct = Math.round(acc * 100);
  const accColor = acc > 0.7 ? C.teal : acc > 0.4 ? C.amber : C.red;
  const integ = entry.integrity_score ?? 0.5;
  const integColor = integ > 0.7 ? C.teal : integ > 0.4 ? C.amber : C.red;
  const authKey = entry.phase1_image_auth ?? "unclear";
  const authStyle = authMeta[authKey] ?? authMeta.unclear;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      style={{
        borderRadius: "12px",
        background: "rgba(0,223,178,0.015)",
        border: "1px solid rgba(0,223,178,0.10)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        {/* Dot indicator */}
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal, boxShadow: `0 0 6px ${C.teal}` }} />
        <span style={{ ...capsLabel, color: C.teal }}>3-Phase AI Cross-Examination</span>
      </div>

      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* FASE 1 */}
        {hasPhase1 && (
          <div>
            <div style={{ ...capsLabel, color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>
              Phase 1 — Visual Witness
            </div>
            {entry.visual_description && (
              <p style={{
                ...sans, fontSize: "12px", color: "rgba(255,255,255,0.6)",
                lineHeight: 1.65, fontStyle: "italic",
                padding: "8px 12px", borderRadius: "8px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                marginBottom: "8px",
              }}>
                &quot;{entry.visual_description}&quot;
              </p>
            )}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
              {entry.phase1_scene_type && (
                <Pill color={C.teal}>scene: {entry.phase1_scene_type.replace(/_/g, " ")}</Pill>
              )}
              {entry.phase1_people_visible !== undefined && (
                <Pill color={C.purple}>{entry.phase1_people_visible} people visible</Pill>
              )}
              {entry.phase1_image_auth && (
                <Pill color={authStyle.color} bg={authStyle.bg}>
                  {entry.phase1_image_auth.replace(/_/g, " ")}
                </Pill>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        {hasPhase1 && hasPhase2 && (
          <div style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />
        )}

        {/* FASE 2 */}
        {hasPhase2 && (
          <div>
            <div style={{ ...capsLabel, color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>
              Phase 2 — Cross-Examination
            </div>
            {/* Verdict + accuracy in one row */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" as const }}>
              <Pill color={vm.color} bg={vm.bg} bd={vm.bd}>{vm.label}</Pill>
              {entry.claim_accuracy_score !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "120px" }}>
                  <span style={{ ...capsLabel }}>Claim Accuracy</span>
                  <div style={{ flex: 1 }}>
                    <Bar value={accPct} color={accColor} />
                  </div>
                  <span style={{ ...mono, fontSize: "10px", fontWeight: 700, color: accColor, minWidth: "30px", textAlign: "right" }}>
                    {accPct}%
                  </span>
                </div>
              )}
            </div>
            {/* AI reasoning */}
            {entry.llm_reason && (
              <div style={{
                padding: "8px 11px", borderRadius: "8px",
                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                marginBottom: entry.discrepancies?.length ? "8px" : 0,
              }}>
                <p style={{ ...sans, fontSize: "11px", color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>Reasoning:</span>{" "}
                  {entry.llm_reason}
                </p>
              </div>
            )}
            {/* Discrepancies */}
            {entry.discrepancies && entry.discrepancies.length > 0 && (
              <div>
                <div style={{ ...capsLabel, color: `${C.amber}99`, marginBottom: "6px" }}>
                  Discrepancies found
                </div>
                {entry.discrepancies.slice(0, 4).map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: "7px", marginBottom: "4px", alignItems: "flex-start" }}>
                    <div style={{
                      marginTop: "4px", width: "5px", height: "5px", borderRadius: "50%",
                      background: C.amber, flexShrink: 0,
                    }} />
                    <p style={{ ...sans, fontSize: "10px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{d}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {hasPhase2 && hasPhase3 && (
          <div style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />
        )}

        {/* FASE 3 */}
        {hasPhase3 && (
          <div>
            <div style={{ ...capsLabel, color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>
              Phase 3 — Integrity Synthesis
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <Bar value={integ * 100} color={integColor} height={5} />
              </div>
              <span style={{ ...mono, fontSize: "11px", fontWeight: 700, color: integColor, minWidth: "32px", textAlign: "right" }}>
                {Math.round(integ * 100)}%
              </span>
            </div>
            <p style={{ ...capsLabel, marginTop: "5px" }}>
              Overall integrity score from all verification phases
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Voting Panel ──────────────────────────────────────────────────────────────
function VotingPanel({
  entry, address, reputationScore, onVoted,
}: { entry: StreamEntry; address: string; reputationScore: number; onVoted: () => void }) {
  const vi = entry.vote_info!;
  const [voting, setVoting] = useState(false);
  const [msg, setMsg] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimTx, setClaimTx] = useState("");

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: isProcessed } = useReadContract({
    address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`,
    abi: BENEVOLENCE_VAULT_ABI,
    functionName: "isEventProcessed",
    args: [pad(`0x${entry.event_id.replace(/-/g, "")}` as `0x${string}`, { size: 32 })],
  });

  const isOwner = address.toLowerCase() === entry.volunteer_address.toLowerCase();
  const hasVoted = vi.voters?.map(v => v.toLowerCase()).includes(address.toLowerCase());
  const isChampion = reputationScore >= 500;
  const isChampionAudit = entry.needs_champion_audit;
  const canVote = isChampionAudit ? isChampion : (vi.phase === 2 || isChampion);
  const total = (vi.approve + vi.reject) || 1;
  const approveP = Math.round((vi.approve / total) * 100);
  const rejectP = 100 - approveP;

  const handleClaim = async () => {
    setClaiming(true); setMsg("");
    try {
      const res = await fetch(`${ORACLE_URL}/api/v1/vote/claim/${entry.event_id}`, {
        headers: { "X-HAVEN-Oracle-Key": ORACLE_KEY },
      });
      if (!res.ok) {
        const d = await res.json();
        setMsg(typeof d.detail === "string" ? d.detail : "Claim payload belum siap, coba lagi.");
        return;
      }
      const real = await res.json();
      const ca = real.contract_args;
      const hash = await writeContractAsync({
        address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`,
        abi: BENEVOLENCE_VAULT_ABI,
        functionName: "releaseReward",
        args: [
          pad(`0x${real.event_id.replace(/-/g, "")}` as `0x${string}`, { size: 32 }),
          address as `0x${string}`,
          (ca.beneficiaryAddress ?? address) as `0x${string}`,
          BigInt(ca.impactScoreScaled), BigInt(ca.tokenRewardWei),
          pad(`0x${real.zk_proof_hash.replace("0x", "")}` as `0x${string}`, { size: 32 }),
          pad(`0x${real.event_hash.replace("0x", "")}` as `0x${string}`, { size: 32 }),
          real.nonce, BigInt(real.expires_at),
          Number(real.signature.v),
          real.signature.r as `0x${string}`,
          real.signature.s as `0x${string}`,
        ],
        gas: 800000n,
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      setClaimTx(hash);
      setMsg("Reward berhasil diklaim");
      onVoted();
    } catch (e: any) {
      setMsg(e.message?.slice(0, 120) || "Klaim gagal");
    } finally { setClaiming(false); }
  };

  const handleVote = async (vote: "approve" | "reject") => {
    setVoting(true);
    try {
      const res = await fetch(`${ENV.ORACLE_URL}/api/v1/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-HAVEN-Oracle-Key": ENV.HAVEN_ORACLE_KEY },
        body: JSON.stringify({
          event_id: entry.event_id,
          voter_address: address,
          vote,
          reputation_score: reputationScore,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        setMsg(typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((e: any) => e.msg || JSON.stringify(e)).join("; ")
            : "Vote failed");
        return;
      }
      setMsg(data.outcome ? `Outcome: ${data.outcome.toUpperCase()}` : "Vote recorded");
      onVoted();
    } catch { setMsg("Network error"); }
    finally { setVoting(false); }
  };

  // ── Outcome: voting closed ──────────────────────────────────────────────────
  if (vi.outcome) {
    const approved = vi.outcome === "approved";
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: "14px 16px", borderRadius: "12px",
          background: approved ? "rgba(0,223,178,0.06)" : "rgba(255,80,80,0.06)",
          border: `1px solid ${approved ? "rgba(0,223,178,0.2)" : "rgba(255,80,80,0.2)"}`,
          display: "flex", flexDirection: "column", gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Colored circle instead of emoji */}
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
            background: approved ? "rgba(0,223,178,0.15)" : "rgba(255,80,80,0.15)",
            border: `1px solid ${approved ? "rgba(0,223,178,0.3)" : "rgba(255,80,80,0.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: approved ? C.teal : C.red,
              boxShadow: `0 0 6px ${approved ? C.teal : C.red}`,
            }} />
          </div>
          <div>
            <p style={{ ...sans, fontWeight: 700, fontSize: "12px", color: approved ? C.teal : C.red }}>
              Community {vi.outcome.toUpperCase()}
            </p>
            <p style={{ fontSize: "10px", color: C.dimText, marginTop: "2px", ...mono }}>
              {vi.approve} approve · {vi.reject} reject
            </p>
          </div>
        </div>

        {/* Claim reward button (owner only, approved only) */}
        {approved && isOwner && (
          <div>
            {isProcessed || claimTx ? (
              <div style={{
                padding: "9px 12px", borderRadius: "8px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                textAlign: "center",
              }}>
                <p style={{ ...sans, fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                  Reward Claimed
                </p>
              </div>
            ) : msg ? (
              <p style={{ ...sans, fontSize: "11px", color: C.teal, fontWeight: 600, textAlign: "center" }}>{msg}</p>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleClaim} disabled={claiming}
                style={{
                  width: "100%", padding: "10px", borderRadius: "8px", border: "none",
                  background: claiming
                    ? "rgba(255,255,255,0.04)"
                    : "linear-gradient(90deg, rgba(255,189,89,0.18), rgba(255,110,180,0.12))",
                  color: C.amber,
                  ...sans, fontSize: "13px", fontWeight: 800, cursor: claiming ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em", transition: "background 0.2s",
                }}
              >
                {claiming ? "Processing…" : "Claim Reward"}
              </motion.button>
            )}
          </div>
        )}

        {claimTx && (
          <p style={{ ...mono, fontSize: "10px", color: `${C.teal}99` }}>
            Tx: {claimTx.slice(0, 20)}…
          </p>
        )}
      </motion.div>
    );
  }

  // ── Outcome: voting open ────────────────────────────────────────────────────
  const phaseLabel = isChampionAudit
    ? "CHAMPION AUDIT"
    : vi.phase === 1
      ? `CHAMPION ONLY · opens in ${Math.ceil(vi.phase2_in / 60)}m`
      : "OPEN VOTE";
  const phaseColor = (vi.phase === 1 || isChampionAudit) ? C.purple : C.teal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "14px 16px", borderRadius: "12px",
        background: "rgba(255,189,89,0.04)", border: "1px solid rgba(255,189,89,0.18)",
        display: "flex", flexDirection: "column", gap: "12px",
      }}
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={{ ...capsLabel, color: C.amber }}>Needs Community Vote</span>
        <Pill color={phaseColor}>{phaseLabel}</Pill>
      </div>

      {/* Vote progress */}
      {vi.total > 0 && (
        <div>
          <div style={{ display: "flex", height: "5px", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ width: `${approveP}%`, background: C.teal, transition: "width 0.4s" }} />
            <div style={{ width: `${rejectP}%`, background: C.red, transition: "width 0.4s" }} />
          </div>
          <p style={{ ...capsLabel, marginTop: "5px" }}>
            {vi.approve} approve · {vi.reject} reject · quorum: 3
          </p>
        </div>
      )}

      {/* State-based CTA */}
      {msg ? (
        <p style={{ ...sans, fontSize: "11px", color: C.teal, fontWeight: 600 }}>{msg}</p>
      ) : isOwner ? (
        <p style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.35)", textAlign: "center", fontStyle: "italic" }}>
          Waiting for community vote…
        </p>
      ) : hasVoted ? (
        <div style={{
          padding: "9px 12px", borderRadius: "8px",
          background: "rgba(0,223,178,0.07)", border: "1px solid rgba(0,223,178,0.2)",
          textAlign: "center",
        }}>
          <p style={{ ...mono, fontSize: "11px", color: C.teal }}>Vote submitted</p>
        </div>
      ) : canVote ? (
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { label: "Approve", vote: "approve" as const, color: C.teal, bg: "rgba(0,223,178,0.10)" },
            { label: "Reject", vote: "reject" as const, color: C.red, bg: "rgba(255,80,80,0.08)" },
          ].map(({ label, vote, color, bg }) => (
            <motion.button
              key={vote}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => handleVote(vote)} disabled={voting}
              style={{
                flex: 1, padding: "9px", borderRadius: "8px", border: "none",
                background: voting ? "rgba(255,255,255,0.04)" : bg,
                color: voting ? "rgba(255,255,255,0.3)" : color,
                ...sans, fontSize: "12px", fontWeight: 700,
                cursor: voting ? "not-allowed" : "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {voting ? "…" : label}
            </motion.button>
          ))}
        </div>
      ) : (
        <p style={{ ...mono, fontSize: "10px", color: `${C.amber}99` }}>
          {isChampionAudit
            ? "Exclusive vote — Champion+ reputation (score ≥ 500) required."
            : `Champion-only phase. Opens to all voters in ${Math.ceil(vi.phase2_in / 60)} minutes.`}
        </p>
      )}
    </motion.div>
  );
}

// ── Stream Card ───────────────────────────────────────────────────────────────
function StreamCard({
  entry, address, reputationScore, onVoted,
}: { entry: StreamEntry; address: string; reputationScore: number; onVoted: () => void }) {
  const flagged = entry.needs_community_review;
  const [expanded, setExpanded] = useState(false);

  const accentColor = flagged ? C.amber : C.teal;
  const topGradient = flagged
    ? `linear-gradient(90deg, ${C.amber}, ${C.pink})`
    : `linear-gradient(90deg, ${C.teal}, ${C.purple})`;

  return (
    <motion.div
      layout
      style={{
        ...glassCard,
        border: `1px solid ${flagged ? "rgba(255,189,89,0.2)" : C.faintBd}`,
        boxShadow: flagged ? `0 0 24px rgba(255,189,89,0.05)` : "none",
      }}
    >
      {/* Accent top bar */}
      <div style={{ height: "2px", background: topGradient }} />

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
            <ActionBadge type={entry.action_type} />
            <UrgencyBadge level={entry.urgency_level} />
            {entry.source === "live_capture" && (
              <Pill color={C.teal}>Live</Pill>
            )}
            {entry.needs_champion_audit && (
              <Pill color={C.purple}>Champion Audit</Pill>
            )}
            {/* Integrity warnings — compact, no emoji */}
            {(entry.integrity_warnings?.length ?? 0) > 0 && (
              <Pill color={C.red}>
                {entry.integrity_warnings!.length} flag{entry.integrity_warnings!.length > 1 ? "s" : ""}
              </Pill>
            )}
          </div>
          <span style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap" as const }}>
            {timeAgo(entry.submitted_at)}
          </span>
        </div>

        {/* ── Evidence row ── */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          {/* Image thumbnail / placeholder */}
          {entry.image_base64 ? (
            <>
              <motion.div
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setExpanded(true)}
                style={{ cursor: "zoom-in", flexShrink: 0 }}
              >
                <img
                  src={`data:image/jpeg;base64,${entry.image_base64}`}
                  alt="Evidence"
                  style={{
                    width: "80px", height: "80px", borderRadius: "10px", objectFit: "cover",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                    display: "block",
                  }}
                />
              </motion.div>

              {/* Fullscreen overlay */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setExpanded(false)}
                    style={{
                      position: "fixed", inset: 0, zIndex: 9999,
                      background: "rgba(3,8,14,0.92)", backdropFilter: "blur(10px)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "20px", cursor: "zoom-out",
                    }}
                  >
                    <motion.img
                      initial={{ scale: 0.88, y: 24 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.88, y: 24 }}
                      transition={{ type: "spring", damping: 26, stiffness: 280 }}
                      src={`data:image/jpeg;base64,${entry.image_base64}`}
                      alt="Expanded Evidence"
                      onClick={e => e.stopPropagation()}
                      style={{
                        maxWidth: "100%", maxHeight: "88vh",
                        borderRadius: "16px", objectFit: "contain",
                        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}
                    />
                    <button
                      onClick={() => setExpanded(false)}
                      style={{
                        position: "absolute", top: "28px", right: "28px",
                        width: "40px", height: "40px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.09)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "rgba(255,255,255,0.7)", fontSize: "16px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", backdropFilter: "blur(4px)",
                      }}
                    >
                      ✕
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* No-image placeholder */
            <div style={{
              width: "80px", height: "80px", borderRadius: "10px", flexShrink: 0,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(255,255,255,0.06)" }} />
            </div>
          )}

          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", marginBottom: "4px" }}>
              {entry.volunteer_address.slice(0, 10)}…{entry.volunteer_address.slice(-8)}
            </p>
            <p style={{ ...sans, fontSize: "13px", color: "rgba(255,255,255,0.72)", lineHeight: 1.65, marginBottom: "8px" }}>
              {(entry.description?.length ?? 0) > 120
                ? entry.description.slice(0, 120) + "…"
                : entry.description || "No description"}
            </p>
            {/* Event ID */}
            <div style={{
              padding: "5px 10px", borderRadius: "6px",
              background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px",
            }}>
              <span style={{ ...capsLabel }}>Event ID</span>
              <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.35)", userSelect: "all", cursor: "copy" }}>
                {entry.event_id}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "12px",
          paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.04)",
        }}>
          {[
            { label: "Score", value: `${entry.impact_score}/100`, grad: `linear-gradient(90deg, ${C.teal}, ${C.purple})` },
            { label: "Reward", value: `${(entry.token_reward ?? 0).toFixed(2)} HAVEN`, grad: `linear-gradient(90deg, ${C.amber}, ${C.pink})` },
            { label: "Effort", value: `${entry.effort_hours}h`, grad: `linear-gradient(90deg, ${C.purple}, ${C.pink})` },
            { label: "Helped", value: `${entry.people_helped}`, grad: `linear-gradient(90deg, ${C.teal}, ${C.purple})` },
          ].map(s => (
            <div key={s.label}>
              <p style={capsLabel}>{s.label}</p>
              <p style={{ ...mono, fontSize: "13px", fontWeight: 700, background: s.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: "4px" }}>
                {s.value}
              </p>
            </div>
          ))}
          {(entry.latitude !== 0 || entry.longitude !== 0) && (
            <div>
              <p style={capsLabel}>GPS</p>
              <p style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                {(entry.latitude ?? 0).toFixed(3)}, {(entry.longitude ?? 0).toFixed(3)}
              </p>
            </div>
          )}
        </div>

        {/* ── AI Confidence bar ── */}
        <ConfidenceRow value={entry.ai_confidence} />

        {/* ── 3-Phase Cross-Examination Panel ── */}
        <CrossExamPanel entry={entry} />

        {/* ── Integrity warnings expanded (v2.0) ── */}
        {(entry.integrity_warnings?.length ?? 0) > 0 && (
          <div style={{
            padding: "10px 12px", borderRadius: "8px",
            background: "rgba(255,80,80,0.04)", border: "1px solid rgba(255,80,80,0.12)",
          }}>
            <p style={{ ...capsLabel, color: `${C.red}cc`, marginBottom: "6px" }}>
              Integrity Flags ({entry.integrity_warnings!.length})
            </p>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" as const }}>
              {entry.integrity_warnings!.map((w, i) => (
                <Pill key={i} color={C.red}>
                  {w.replace(/_/g, " ")}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {/* ── Voting panel ── */}
        {flagged && entry.vote_info && (
          <VotingPanel
            entry={entry}
            address={address}
            reputationScore={reputationScore}
            onVoted={onVoted}
          />
        )}
      </div>
    </motion.div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ ...glassCard, overflow: "hidden" }}>
      <div style={{ height: "2px", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {[60, 100, 80].map((w, i) => (
          <div key={i} style={{ height: "10px", borderRadius: "5px", width: `${w}%`, background: "rgba(255,255,255,0.04)", animation: "shimmer 1.6s ease-in-out infinite" }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CommunityStream({
  address,
  reputationScore,
}: { address: string; reputationScore: number }) {
  const [items, setItems] = useState<StreamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const rank = getRank(reputationScore);

  const fetchStream = useCallback(async () => {
    try {
      const res = await fetch(`${ORACLE_URL}/api/v1/stream`, {
        headers: { "X-HAVEN-Oracle-Key": ORACLE_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch { /* oracle might be offline */ }
    finally { setLoading(false); setLastRefresh(Date.now()); }
  }, []);

  useEffect(() => {
    fetchStream();
    const id = setInterval(fetchStream, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStream]);

  const pending = items.filter(i => i.needs_community_review && !i.vote_info?.outcome);

  const filteredItems = items
    .filter(entry => {
      if (filter === "all") return true;
      if (filter === "pending") return entry.needs_community_review && !entry.vote_info?.outcome;
      if (filter === "approved") return entry.vote_info?.outcome === "approved";
      if (filter === "rejected") return entry.vote_info?.outcome === "rejected";
      return true;
    })
    .sort((a, b) => {
      const ap = a.needs_community_review && !a.vote_info?.outcome;
      const bp = b.needs_community_review && !b.vote_info?.outcome;
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return b.submitted_at - a.submitted_at;
    });

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div style={{ maxWidth: "680px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" as const, gap: "12px" }}>
        <div>
          <p style={{
            ...mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            background: `linear-gradient(90deg, ${C.pink}, ${C.amber})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: "6px",
          }}>Community Stream</p>
          <p style={{ ...sans, fontWeight: 800, fontSize: "22px", color: "#fff" }}>
            Aktivitas Komunitas
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" as const }}>
          {pending.length > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                padding: "6px 12px", borderRadius: "20px",
                background: "rgba(255,189,89,0.07)", border: "1px solid rgba(255,189,89,0.22)",
              }}
            >
              <span style={{ ...mono, fontSize: "10px", fontWeight: 700, color: C.amber }}>
                {pending.length} pending vote{pending.length > 1 ? "s" : ""}
              </span>
            </motion.div>
          )}
          <div style={{
            padding: "6px 12px", borderRadius: "20px",
            background: "rgba(124,106,255,0.07)", border: "1px solid rgba(124,106,255,0.18)",
          }}>
            <span style={{ ...mono, fontSize: "10px", fontWeight: 700, color: C.purple }}>
              {rank.rank}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={fetchStream}
            style={{
              padding: "6px 12px", borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent", color: "rgba(255,255,255,0.35)",
              ...mono, fontSize: "11px", cursor: "pointer",
            }}
          >
            Refresh
          </motion.button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", overflowX: "auto", paddingBottom: "4px" }}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setFilter(key)}
              style={{
                padding: "6px 16px", borderRadius: "20px",
                border: `1px solid ${active ? "rgba(0,223,178,0.4)" : "rgba(255,255,255,0.08)"}`,
                background: active ? "rgba(0,223,178,0.09)" : "rgba(255,255,255,0.02)",
                color: active ? C.teal : "rgba(255,255,255,0.4)",
                ...sans, fontSize: "12px", fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.18s",
              }}
            >
              {label}
            </motion.button>
          );
        })}
      </div>

      {/* ── Live indicator ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <motion.div
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.red, boxShadow: `0 0 6px ${C.red}` }}
        />
        <span style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.22)" }}>
          LIVE · polling every 15s · {new Date(lastRefresh).toLocaleTimeString()}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "60px 40px", textAlign: "center",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.015)",
            border: "1px dashed rgba(255,255,255,0.08)",
          }}
        >
          {/* Abstract visual placeholder instead of emoji */}
          <div style={{
            width: "64px", height: "64px", margin: "0 auto 20px",
            borderRadius: "20px",
            background: "rgba(124,106,255,0.06)",
            border: "1px solid rgba(124,106,255,0.16)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(124,106,255,0.08) inset",
          }}>
            <div style={{
              width: "24px", height: "24px", borderRadius: "8px",
              background: "rgba(124,106,255,0.25)",
              boxShadow: `0 0 12px ${C.purple}`,
            }} />
          </div>
          <p style={{ ...sans, fontWeight: 700, fontSize: "17px", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>
            Nothing here yet
          </p>
          <p style={{ ...sans, fontSize: "13px", color: "rgba(255,255,255,0.35)", lineHeight: 1.65, maxWidth: "280px", margin: "0 auto" }}>
            {filter === "all"
              ? "No impact proofs submitted yet. Be the first."
              : "No entries matching this filter."}
          </p>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <AnimatePresence mode="popLayout">
            {filteredItems.map((entry, index) => (
              <motion.div
                key={entry.event_id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(6px)" }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.24), ease: [0.4, 0, 0.2, 1] }}
              >
                <StreamCard
                  entry={entry}
                  address={address}
                  reputationScore={reputationScore}
                  onVoted={fetchStream}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}