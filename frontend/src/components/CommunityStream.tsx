"use client";

import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import { useSigner } from "@/contexts/SignerContext";
import { ethers } from "ethers";
import NextImage from "next/image";
import { pad } from "viem";
import { CONTRACTS, ACTION_TYPES, URGENCY_LEVELS, getRank } from "../utils/constants";
import { BENEVOLENCE_VAULT_ABI } from "../utils/abis";
import { ENV } from "../utils/env";
import { motion, AnimatePresence } from "framer-motion";

const ORACLE_URL = ENV.ORACLE_URL;
const ORACLE_KEY = ENV.HAVEN_ORACLE_KEY || "HAVEN_ROKAN_NJXBDSA_010011";
const POLL_MS = 15_000;

interface VoteInfo {
  approve: number; reject: number; total: number;
  outcome: string | null; phase: number; phase2_in: number; voters?: string[];
}
interface StreamEntry {
  event_id: string; volunteer_address: string; action_type: string;
  urgency_level: string; description: string; latitude: number; longitude: number;
  effort_hours: number; people_helped: number; impact_score: number;
  ai_confidence: number; token_reward: number; source: string;
  image_base64: string | null; integrity_warnings: string[];
  parameter_warnings?: string[]; llm_verdict?: string; llm_reason?: string;
  visual_description?: string; claim_accuracy_score?: number;
  discrepancies?: string[]; integrity_score?: number;
  phase1_scene_type?: string; phase1_people_visible?: number;
  phase1_activity?: string; phase1_image_auth?: string;
  needs_community_review: boolean; needs_champion_audit?: boolean;
  submitted_at: number; vote_info?: VoteInfo;
}

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

function timeAgo(unix: number) {
  const s = Math.floor(Date.now() / 1000) - unix;
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Utility tags ──────────────────────────────────────────────────────────────
function Tag({ children, opacity = 0.5 }: { children: React.ReactNode; opacity?: number }) {
  return (
    <span style={{
      fontFamily: S, fontStyle: "italic", fontSize: "9px",
      color: opacity >= 0.8 ? "var(--hv-text)" : opacity >= 0.5 ? "var(--hv-t2)" : "var(--hv-t3)",
      padding: "3px 8px",
      border: opacity >= 0.8 ? "1px solid var(--hv-border3)" : "1px solid var(--hv-border)",
      letterSpacing: "0.07em", whiteSpace: "nowrap" as const,
    }}>{children}</span>
  );
}

function ScoreDial({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const opacity = value >= 70 ? 0.9 : value >= 40 ? 0.55 : 0.3;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <p style={{ fontFamily: M, fontSize: "20px", color: opacity >= 0.8 ? "var(--hv-text)" : opacity >= 0.5 ? "var(--hv-t2)" : "var(--hv-t3)", lineHeight: 1 }}>
        {value.toFixed(0)}
      </p>
      <div style={{ width: "32px", height: "1px", background: "var(--hv-surf2)", position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`, background: "var(--hv-text)",
          transition: "width 0.6s ease",
        }} />
      </div>
      <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "8px", color: "var(--hv-t4)", letterSpacing: "0.1em" }}>
        / {max}
      </p>
    </div>
  );
}

// ── Cross-examination panel ─────────────────────────────────────────────────
function CrossExamPanel({ entry }: { entry: StreamEntry }) {
  const hasPhase1 = entry.visual_description || entry.phase1_scene_type;
  const hasPhase2 = entry.llm_verdict || entry.claim_accuracy_score !== undefined;
  const hasPhase3 = entry.integrity_score !== undefined;
  if (!hasPhase1 && !hasPhase2 && !hasPhase3) return null;

  const verdict = entry.llm_verdict ?? "suspicious";
  const verdictOpacity = verdict === "consistent" ? 0.8 : verdict === "fabricated" ? 0.35 : 0.55;
  const acc = entry.claim_accuracy_score ?? 0.5;
  const accPct = Math.round(acc * 100);
  const integ = entry.integrity_score ?? 0.5;

  return (
    <div style={{
      border: "1px solid var(--hv-border)",
      borderTop: "1px solid var(--hv-border2)",
      background: "var(--hv-bg2)",
      padding: "20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
        <span style={{
          fontFamily: S, fontSize: "9px", fontStyle: "italic",
          color: "var(--hv-t4)", letterSpacing: "0.18em", textTransform: "uppercase",
        }}>3-Phase AI Cross-Examination</span>
        <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
      </div>

      {/* Phase 1 Visual witness */}
      {hasPhase1 && (
        <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--hv-border)" }}>
          <p style={{
            fontFamily: S, fontSize: "9px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.15em",
            textTransform: "uppercase", marginBottom: "10px",
          }}>Phase I Visual Witness</p>

          {entry.visual_description && (
            <p style={{
              fontFamily: S, fontStyle: "italic", fontSize: "12px",
              color: "var(--hv-t3)", lineHeight: 1.75,
              padding: "12px 16px",
              border: "1px solid var(--hv-border)",
              background: "var(--hv-bg2)",
              marginBottom: "10px",
            }}>
              &quot;{entry.visual_description}&quot;
            </p>
          )}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
            {entry.phase1_scene_type && <Tag>{entry.phase1_scene_type.replace(/_/g, " ")}</Tag>}
            {entry.phase1_people_visible !== undefined && <Tag>{entry.phase1_people_visible} visible</Tag>}
            {entry.phase1_image_auth && <Tag opacity={0.4}>{entry.phase1_image_auth.replace(/_/g, " ")}</Tag>}
          </div>
        </div>
      )}

      {/* Phase 2 Cross-examination */}
      {hasPhase2 && (
        <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--hv-border)" }}>
          <p style={{
            fontFamily: S, fontSize: "9px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.15em",
            textTransform: "uppercase", marginBottom: "10px",
          }}>Phase II Claim Cross-Examination</p>

          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" as const }}>
            <div>
              <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)", marginBottom: "4px" }}>
                Verdict
              </p>
              <p style={{
                fontFamily: S, fontSize: "13px",
                color: verdictOpacity >= 0.7 ? "var(--hv-text)" : verdictOpacity >= 0.4 ? "var(--hv-t2)" : "var(--hv-t4)",
              }}>
                {verdict.charAt(0).toUpperCase() + verdict.slice(1)}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)", marginBottom: "4px" }}>
                Claim Accuracy
              </p>
              <p style={{ fontFamily: M, fontSize: "14px", color: accPct >= 70 ? "var(--hv-t2)" : accPct >= 40 ? "var(--hv-t3)" : "var(--hv-t4)" }}>
                {accPct}%
              </p>
            </div>
          </div>

          {entry.llm_reason && (
            <p style={{
              fontFamily: S, fontStyle: "italic", fontSize: "11px",
              color: "var(--hv-t4)", lineHeight: 1.7, marginTop: "10px",
            }}>
              {entry.llm_reason}
            </p>
          )}

          {entry.discrepancies && entry.discrepancies.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              {entry.discrepancies.map((d, i) => (
                <p key={i} style={{
                  fontFamily: S, fontStyle: "italic", fontSize: "10px",
                  color: "var(--hv-t4)", lineHeight: 1.6,
                }}>{d}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phase 3 Integrity score */}
      {hasPhase3 && (
        <div>
          <p style={{
            fontFamily: S, fontSize: "9px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.15em",
            textTransform: "uppercase", marginBottom: "10px",
          }}>Phase III Integrity Synthesis</p>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <p style={{
              fontFamily: M, fontSize: "24px",
              color: integ >= 0.7 ? "var(--hv-text)" : integ >= 0.4 ? "var(--hv-t2)" : "var(--hv-t4)",
            }}>{(integ * 100).toFixed(0)}</p>
            <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)", position: "relative" }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${integ * 100}%`, background: "var(--hv-action-bg)",
                transition: "width 0.8s ease",
              }} />
            </div>
            <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)" }}>
              / 100
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vote panel ────────────────────────────────────────────────────────────────
function VotePanel({
  entry, address, reputationScore, onVoted,
}: { entry: StreamEntry; address: string; reputationScore: number; onVoted: () => void }) {
  const { signer } = useSigner();
  const publicClient = usePublicClient();
  const [voting, setVoting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState("");
  const [claimTx, setClaimTx] = useState("");

  const vi = entry.vote_info!;
  const isOwner = entry.volunteer_address.toLowerCase() === address.toLowerCase();
  const isProcessed = vi.outcome === "approved" && claimTx !== "";
  const hasVoted = vi.voters?.map(v => v.toLowerCase()).includes(address.toLowerCase());
  const isChampion = reputationScore >= 500;
  const isChampionAudit = entry.needs_champion_audit;
  const canVote = isChampionAudit ? isChampion : (vi.phase === 2 || isChampion);
  const total = (vi.approve + vi.reject) || 1;
  const approveP = Math.round((vi.approve / total) * 100);

  const handleClaim = async () => {
    setClaiming(true); setMsg("");
    try {
      const res = await fetch(`${ORACLE_URL}/api/v1/vote/claim/${entry.event_id}`, {
        headers: { "X-HAVEN-Oracle-Key": ORACLE_KEY },
      });
      if (!res.ok) { const d = await res.json(); setMsg(typeof d.detail === "string" ? d.detail : "Payload not ready, try again."); return; }
      const real = await res.json();
      const ca = real.contract_args;
      if (!signer) throw new Error("No signer available");
      const contract = new ethers.Contract(CONTRACTS.BENEVOLENCE_VAULT, BENEVOLENCE_VAULT_ABI, signer);
      const tx = await contract.releaseReward(
        pad(`0x${real.event_id.replace(/-/g, "")}` as `0x${string}`, { size: 32 }),
        address as `0x${string}`,
        (ca.beneficiaryAddress ?? address) as `0x${string}`,
        BigInt(ca.impactScoreScaled), BigInt(ca.tokenRewardWei),
        pad(`0x${real.zk_proof_hash.replace("0x", "")}` as `0x${string}`, { size: 32 }),
        pad(`0x${real.event_hash.replace("0x", "")}` as `0x${string}`, { size: 32 }),
        real.nonce, BigInt(real.expires_at),
        Number(real.signature.v), real.signature.r as `0x${string}`, real.signature.s as `0x${string}`,
        { gasLimit: 800000n }
      );
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx.hash as `0x${string}` });
      setClaimTx(tx.hash); setMsg("Reward successfully claimed"); onVoted();
    } catch (e: any) { setMsg(e.message?.slice(0, 120) || "Claim failed"); }
    finally { setClaiming(false); }
  };

  const handleVote = async (vote: "approve" | "reject") => {
    setVoting(true);
    try {
      const res = await fetch(`${ENV.ORACLE_URL}/api/v1/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-HAVEN-Oracle-Key": ENV.HAVEN_ORACLE_KEY },
        body: JSON.stringify({ event_id: entry.event_id, voter_address: address, vote, reputation_score: reputationScore }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        setMsg(typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((e: any) => e.msg || JSON.stringify(e)).join("; ") : "Vote failed");
        return;
      }
      setMsg(data.outcome ? `Outcome: ${data.outcome.toUpperCase()}` : "Vote recorded"); onVoted();
    } catch { setMsg("Network error"); }
    finally { setVoting(false); }
  };

  // Outcome: voting closed
  if (vi.outcome) {
    const approved = vi.outcome === "approved";
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        style={{
          padding: "16px",
          border: approved ? "1px solid var(--hv-border3)" : "1px solid var(--hv-border)",
          borderTop: approved ? "2px solid var(--hv-border-str)" : "2px solid var(--hv-border2)",
          background: "var(--hv-bg2)",
        }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <p style={{
            fontFamily: S, fontSize: "13px",
            color: approved ? "var(--hv-t2)" : "var(--hv-t3)",
          }}>
            Community {vi.outcome.charAt(0).toUpperCase() + vi.outcome.slice(1)}
          </p>
          <p style={{ fontFamily: M, fontSize: "10px", color: "var(--hv-t4)" }}>
            {vi.approve} / {vi.reject}
          </p>
        </div>

        {approved && isOwner && (
          isProcessed || claimTx ? (
            <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "12px", color: "var(--hv-t4)", textAlign: "center" }}>
              Reward claimed
            </p>
          ) : msg ? (
            <p style={{ fontFamily: S, fontSize: "12px", color: "var(--hv-t3)" }}>{msg}</p>
          ) : (
            <button onClick={handleClaim} disabled={claiming} style={{
              width: "100%", padding: "12px",
              background: claiming ? "var(--hv-surf)" : "var(--hv-action-bg)",
              border: "none", color: claiming ? "var(--hv-t4)" : "var(--hv-action-text)",
              fontFamily: S, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase",
              cursor: claiming ? "not-allowed" : "pointer",
            }}>
              {claiming ? "Processing…" : "Claim Reward"}
            </button>
          )
        )}
        {claimTx && (
          <p style={{ fontFamily: M, fontSize: "9px", color: "var(--hv-t4)", marginTop: "8px" }}>
            Tx: {claimTx.slice(0, 20)}…
          </p>
        )}
      </motion.div>
    );
  }

  // Voting open
  const phaseLabel = isChampionAudit ? "CHAMPION AUDIT"
    : vi.phase === 1 ? `CHAMPION ONLY · opens in ${Math.ceil(vi.phase2_in / 60)}m`
      : "OPEN VOTE";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "16px",
        border: "1px solid var(--hv-border2)",
        background: "var(--hv-bg2)",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "12px", color: "var(--hv-t3)" }}>
          Pending Community Review
        </p>
        <span style={{ fontFamily: M, fontSize: "8px", letterSpacing: "0.15em", color: "var(--hv-t4)" }}>
          {phaseLabel}
        </span>
      </div>

      {/* Vote progress bar */}
      {vi.total > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ height: "1px", background: "var(--hv-surf2)", position: "relative" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${approveP}%`, background: "var(--hv-surf2)", transition: "width 0.5s",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
            <span style={{ fontFamily: M, fontSize: "9px", color: "var(--hv-t4)" }}>
              {vi.approve} approve
            </span>
            <span style={{ fontFamily: M, fontSize: "9px", color: "var(--hv-t4)" }}>
              {vi.reject} reject
            </span>
          </div>
        </div>
      )}

      {msg ? (
        <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "12px", color: "var(--hv-t3)" }}>{msg}</p>
      ) : isOwner ? (
        <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "var(--hv-t4)", textAlign: "center" }}>
          Awaiting community deliberation…
        </p>
      ) : hasVoted ? (
        <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "var(--hv-t4)", textAlign: "center" }}>
          Your vote has been recorded.
        </p>
      ) : canVote ? (
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { label: "Approve", vote: "approve" as const, borderOp: 0.2 },
            { label: "Reject", vote: "reject" as const, borderOp: 0.08 },
          ].map(b => (
            <button key={b.vote} onClick={() => handleVote(b.vote)} disabled={voting} style={{
              flex: 1, padding: "10px",
              background: "transparent",
              border: "1px solid var(--hv-border2)",
              color: voting ? "var(--hv-t4)" : "var(--hv-t2)",
              fontFamily: S, fontStyle: "italic", fontSize: "11px",
              letterSpacing: "0.08em",
              cursor: voting ? "not-allowed" : "pointer",
              transition: "all 0.12s",
            }}
              onMouseEnter={e => { if (!voting) (e.currentTarget as HTMLButtonElement).style.background = "var(--hv-surf)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {voting ? "…" : b.label}
            </button>
          ))}
        </div>
      ) : (
        <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)" }}>
          {isChampionAudit
            ? "Restricted Champion designation required (score ≥ 500)."
            : `Champion-only phase. Opens to all voters in ${Math.ceil(vi.phase2_in / 60)} minutes.`}
        </p>
      )}
    </motion.div>
  );
}

// ── Stream Card ────────────────────────────────────────────────────────────────
function StreamCard({
  entry, address, reputationScore, onVoted,
}: { entry: StreamEntry; address: string; reputationScore: number; onVoted: () => void }) {
  const flagged = entry.needs_community_review;
  const [expanded, setExpanded] = useState(false);
  const [showExam, setShowExam] = useState(false);

  const action = ACTION_TYPES?.find((x: any) => x.value === entry.action_type);
  const urgencyLabel = entry.urgency_level;

  return (
    <motion.div layout style={{
      border: flagged ? "1px solid var(--hv-border2)" : "1px solid var(--hv-border)",
      borderTop: flagged ? "2px solid var(--hv-border3)" : "2px solid var(--hv-border)",
      background: flagged ? "var(--hv-t5)" : "var(--hv-t5)",
    }}>
      <div style={{ padding: "20px" }}>

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
            <Tag>{action?.label ?? entry.action_type.replace(/_/g, " ")}</Tag>
            <Tag opacity={0.35}>{urgencyLabel}</Tag>
            {entry.source === "live_capture" && <Tag opacity={0.6}>Live Capture</Tag>}
            {entry.needs_champion_audit && <Tag opacity={0.45}>Champion Audit</Tag>}
            {(entry.integrity_warnings?.length ?? 0) > 0 && (
              <Tag opacity={0.35}>{entry.integrity_warnings!.length} flag{entry.integrity_warnings!.length > 1 ? "s" : ""}</Tag>
            )}
          </div>
          <span style={{ fontFamily: M, fontSize: "10px", color: "var(--hv-t4)", flexShrink: 0 }}>
            {timeAgo(entry.submitted_at)}
          </span>
        </div>

        {/* Evidence row */}
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "16px" }}>
          {/* Image */}
          {entry.image_base64 ? (
            <>
              <div
                onClick={() => setExpanded(true)}
                style={{ cursor: "zoom-in", flexShrink: 0 }}
              >
                <NextImage
                  src={`data:image/jpeg;base64,${entry.image_base64}`}
                  alt="Evidence"
                  width={72}
                  height={72}
                  unoptimized
                  style={{
                    width: "72px", height: "72px", objectFit: "cover",
                    display: "block",
                    border: "1px solid var(--hv-border)",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.75"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
                />
              </div>
              {/* Lightbox */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setExpanded(false)}
                    style={{
                      position: "fixed", inset: 0, zIndex: 9999,
                      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(10px)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "24px", cursor: "zoom-out",
                    }}
                  >
                    <motion.img
                      initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 16 }}
                      transition={{ type: "spring", damping: 28, stiffness: 300 }}
                      src={`data:image/jpeg;base64,${entry.image_base64}`}
                      alt="Expanded"
                      onClick={e => e.stopPropagation()}
                      style={{
                        maxWidth: "100%", maxHeight: "88vh", objectFit: "contain",
                        border: "1px solid var(--hv-border2)",
                      }}
                    />
                    <button onClick={() => setExpanded(false)} style={{
                      position: "absolute", top: "24px", right: "24px",
                      width: "36px", height: "36px",
                      background: "var(--hv-surf2)", border: "1px solid var(--hv-border2)",
                      color: "var(--hv-t2)", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}>✕</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div style={{
              width: "72px", height: "72px", flexShrink: 0,
              border: "1px solid var(--hv-border)",
              background: "var(--hv-bg2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: "20px", height: "20px", background: "var(--hv-surf)" }} />
            </div>
          )}

          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: M, fontSize: "10px", color: "var(--hv-t4)", marginBottom: "6px" }}>
              {entry.volunteer_address.slice(0, 10)}…{entry.volunteer_address.slice(-8)}
            </p>
            <p style={{
              fontFamily: S, fontSize: "13px",
              color: "var(--hv-t2)", lineHeight: 1.7, marginBottom: "10px",
            }}>
              {(entry.description?.length ?? 0) > 140
                ? entry.description.slice(0, 140) + "…"
                : entry.description || "No description provided"}
            </p>
            {/* Event ID */}
            <div style={{
              padding: "5px 10px",
              border: "1px dashed var(--hv-border)",
              display: "flex", justifyContent: "space-between", gap: "8px",
            }}>
              <span style={{ fontFamily: S, fontStyle: "italic", fontSize: "9px", color: "var(--hv-t4)" }}>
                Event ID
              </span>
              <span style={{ fontFamily: M, fontSize: "9px", color: "var(--hv-t4)", userSelect: "all", cursor: "copy" }}>
                {entry.event_id}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          borderTop: "1px solid var(--hv-border)",
          paddingTop: "16px", gap: "8px",
          marginBottom: "14px",
        }}>
          {[
            { label: "Impact", value: entry.impact_score?.toFixed(1) ?? "—", suffix: "/100" },
            { label: "Confidence", value: `${((entry.ai_confidence ?? 0) * 100).toFixed(0)}`, suffix: "%" },
            { label: "Reward", value: entry.token_reward?.toFixed(2) ?? "—", suffix: " VELD" },
            { label: "People", value: entry.people_helped?.toString() ?? "—", suffix: "" },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "9px", color: "var(--hv-t4)", marginBottom: "4px", letterSpacing: "0.1em" }}>
                {s.label}
              </p>
              <p style={{ fontFamily: M, fontSize: "13px", color: "var(--hv-t2)" }}>
                {s.value}<span style={{ fontSize: "9px", color: "var(--hv-t4)" }}>{s.suffix}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Toggle AI report */}
        <button onClick={() => setShowExam(e => !e)} style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontFamily: S, fontStyle: "italic", fontSize: "11px",
          color: "var(--hv-t4)", letterSpacing: "0.06em",
          padding: "0 0 4px",
          borderBottom: "1px solid var(--hv-border)",
          transition: "color 0.12s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--hv-t2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--hv-t3)"; }}
        >
          {showExam ? "Conceal" : "Reveal"} AI analysis
        </button>
      </div>

      {/* AI exam panel */}
      <AnimatePresence>
        {showExam && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CrossExamPanel entry={entry} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vote panel */}
      {entry.needs_community_review && entry.vote_info && (
        <div style={{ padding: "0 20px 20px" }}>
          <VotePanel entry={entry} address={address} reputationScore={reputationScore} onVoted={onVoted} />
        </div>
      )}
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CommunityStream({ address, reputationScore }: { address: string; reputationScore: number }) {
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "review">("all");

  const fetchStream = useCallback(async () => {
    try {
      const res = await fetch(`${ORACLE_URL}/api/v1/stream`, {
        headers: { "X-HAVEN-Oracle-Key": ORACLE_KEY },
      });
      const data = await res.json();
      setEntries(data.items ?? []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStream();
    const id = setInterval(fetchStream, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStream]);

  const visible = filter === "review" ? entries.filter(e => e.needs_community_review) : entries;
  const reviewCount = entries.filter(e => e.needs_community_review).length;

  return (
    <div style={{ maxWidth: "760px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Community Record</span>
          <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: "var(--hv-surf2)",
              animation: "csFeed 2.6s ease-in-out infinite",
            }} />
            <span style={{ fontFamily: M, fontSize: "8px", letterSpacing: "0.18em", color: "var(--hv-t4)" }}>LIVE</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontFamily: S, fontWeight: 400, fontSize: "30px", color: "var(--hv-text)", marginBottom: "6px" }}>
              {entries.length.toLocaleString()}
              <span style={{ fontSize: "18px", color: "var(--hv-t4)", fontStyle: "italic" }}> submissions on record</span>
            </h2>
            {reviewCount > 0 && (
              <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "13px", color: "var(--hv-t4)" }}>
                {reviewCount} pending community review
              </p>
            )}
          </div>

          {/* Filter */}
          <div style={{ display: "flex", gap: "2px" }}>
            {[
              { key: "all", label: "All" },
              { key: "review", label: `Review (${reviewCount})` },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFilter(f.key as any)}
                style={{
                  padding: "8px 16px",
                  background: filter === f.key ? "#fff" : "transparent",
                  border: "1px solid var(--hv-border2)",
                  color: filter === f.key ? "var(--hv-action-text)" : "var(--hv-t3)",
                  fontFamily: S, fontStyle: "italic", fontSize: "11px",
                  letterSpacing: "0.08em", cursor: "pointer",
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => { if (filter !== f.key) (e.currentTarget as HTMLButtonElement).style.background = "var(--hv-surf)"; }}
                onMouseLeave={e => { if (filter !== f.key) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "14px", color: "var(--hv-t4)" }}>
            Retrieving community submissions…
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div style={{
          padding: "64px 40px", textAlign: "center",
          border: "1px solid var(--hv-border)",
        }}>
          <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "16px", color: "var(--hv-t4)", marginBottom: "8px" }}>
            {filter === "review" ? "No submissions pending review." : "The record is empty."}
          </p>
          <p style={{ fontFamily: S, fontSize: "12px", color: "var(--hv-t5)" }}>
            Submit your first impact proof to initialise the community ledger.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <AnimatePresence mode="popLayout">
            {visible.map(entry => (
              <StreamCard
                key={entry.event_id}
                entry={entry}
                address={address}
                reputationScore={reputationScore}
                onVoted={fetchStream}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <style>{`
        @keyframes csFeed { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.6)} }
      `}</style>
    </div>
  );
}