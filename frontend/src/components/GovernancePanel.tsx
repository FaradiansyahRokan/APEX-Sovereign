"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useBalance } from "wagmi";
import { useSigner } from "@/contexts/SignerContext";
import { ENV } from "../utils/env";

const ORACLE_API = ENV.ORACLE_URL;
const API_KEY = ENV.HAVEN_ORACLE_KEY || "HAVEN_ROKAN_NJXBDSA_010011";

function hFetch(path: string, opts?: RequestInit) {
  return fetch(`${ORACLE_API}${path}`, {
    ...opts,
    headers: { "X-HAVEN-Oracle-Key": API_KEY, "Content-Type": "application/json", ...opts?.headers },
  });
}

interface Proposal {
  proposal_id: string; proposer: string; title: string; description: string;
  proposal_type: string; status: string; votes_for: number; votes_against: number;
  support_pct: number; voter_count: number; expires_at: number;
}

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px",
  background: "var(--hv-bg2)",
  border: "1px solid var(--hv-border2)",
  fontFamily: M, fontSize: "12px", color: "var(--hv-t2)",
  outline: "none", boxSizing: "border-box" as const, borderRadius: "0",
};

function StatusTag({ status }: { status: string }) {
  const opacity = status === "active" ? 0.8 : status === "passed" ? 0.7 : 0.35;
  return (
    <span style={{
      fontFamily: S, fontStyle: "italic", fontSize: "10px",
      letterSpacing: "0.1em", color: opacity >= 0.7 ? "var(--hv-text)" : opacity >= 0.4 ? "var(--hv-t2)" : "var(--hv-t4)",
      textTransform: "uppercase",
    }}>{status}</span>
  );
}

function VoteBar({ forPct }: { forPct: number }) {
  const passing = forPct >= 0.51;
  return (
    <div style={{ height: "1px", background: "var(--hv-surf2)", position: "relative", margin: "12px 0" }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${forPct * 100}%`,
        background: `var(--hv-surf2)" : "var(--hv-surf2)"`,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

export default function GovernancePanel({ reputationScore, eventCount }: { reputationScore: number; eventCount: number }) {
  const { address: mmAddress } = useAccount();
  const { address: havenAddress } = useSigner();
  const address = mmAddress || havenAddress || undefined;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPower, setVotingPower] = useState(0);
  const [voting, setVoting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", type: "parameter_change" });
  const [submitting, setSubmitting] = useState(false);

  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}`,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ENV.ORACLE_URL}/api/v1/governance/proposals`, {
        headers: { "X-HAVEN-Oracle-Key": ENV.HAVEN_ORACLE_KEY },
      });
      const data = await res.json();
      setProposals(data.proposals || []);
    } catch { } finally { setLoading(false); }
  }, []);

  const loadVotingPower = useCallback(async () => {
    if (!address) return;
    try {
      const params = new URLSearchParams({
        impact_events: eventCount.toString(), tenure_days: "0",
        token_held: nativeBalance ? nativeBalance.formatted : "0",
      });
      const res = await hFetch(`/api/v1/governance/voting-power?${params}`);
      const data = await res.json();
      setVotingPower(data.voting_power || 0);
    } catch { }
  }, [address, eventCount, nativeBalance]);

  useEffect(() => { fetchProposals(); loadVotingPower(); }, [fetchProposals, loadVotingPower]);

  async function castVote(proposalId: string, voteFor: boolean) {
    if (!address) return;
    setVoting(proposalId);
    try {
      const tokenHeld = nativeBalance ? Number(nativeBalance.formatted) : 0;
      const r = await hFetch("/api/v1/governance/vote", {
        method: "POST",
        body: JSON.stringify({
          proposal_id: proposalId, voter_address: address, vote_for: voteFor,
          impact_events: eventCount, tenure_days: 0, token_held_haven: tokenHeld,
        }),
      });
      if (!r.ok) { const e = await r.json(); alert(e.detail || "Vote failed"); }
      else { await fetchProposals(); }
    } catch { alert("Vote failed oracle connection error"); }
    finally { setVoting(null); }
  }

  async function submitProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    if (eventCount < 10) return alert("Minimum 10 verified impact events required to submit a proposal.");
    setSubmitting(true);
    try {
      const r = await hFetch("/api/v1/governance/propose", {
        method: "POST",
        body: JSON.stringify({
          proposer: address, title: formData.title,
          description: formData.description, proposal_type: formData.type,
          impact_events: eventCount,
        }),
      });
      if (!r.ok) { const err = await r.json(); alert(err.detail || "Proposal creation failed"); }
      else {
        setShowForm(false);
        setFormData({ title: "", description: "", type: "parameter_change" });
        await fetchProposals();
      }
    } catch { alert("Proposal creation failed oracle connection error"); }
    finally { setSubmitting(false); }
  }

  const timeLeft = (expiresAt: number) => {
    const diff = expiresAt - Math.floor(Date.now() / 1000);
    if (diff <= 0) return "Expired";
    const d = Math.floor(diff / 86400);
    return d > 0 ? `${d} days remaining` : `${Math.floor(diff / 3600)} hours remaining`;
  };

  const LabelRow = ({ text }: { text: string }) => (
    <p style={{
      fontFamily: S, fontStyle: "italic", fontSize: "11px",
      color: "var(--hv-t4)", marginBottom: "8px", letterSpacing: "0.05em",
    }}>{text}</p>
  );

  return (
    <div style={{ maxWidth: "800px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Deliberative Assembly</span>
          <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{
              fontFamily: S, fontWeight: 400, fontSize: "30px",
              color: "var(--hv-text)", letterSpacing: "0.01em",
            }}>Governance Council</h2>
            <p style={{
              fontFamily: S, fontStyle: "italic", fontSize: "12px",
              color: "var(--hv-t4)", marginTop: "6px",
            }}>Quadratic voting power = √events × tenure + √tokens × 0.3</p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Voting power */}
            {address && (
              <div style={{
                padding: "16px 20px",
                border: "1px solid var(--hv-border2)",
                borderTop: "2px solid var(--hv-border-str)",
              }}>
                <p style={{
                  fontFamily: S, fontSize: "9px", fontStyle: "italic",
                  color: "var(--hv-t4)", letterSpacing: "0.15em",
                  textTransform: "uppercase", marginBottom: "6px",
                }}>Voting Authority</p>
                <p style={{ fontFamily: M, fontSize: "22px", color: "var(--hv-text)" }}>
                  {votingPower.toFixed(2)}
                </p>
              </div>
            )}

            {address && eventCount >= 10 && !showForm && (
              <button onClick={() => setShowForm(true)} style={{
                padding: "12px 24px",
                background: "var(--hv-action-bg)", border: "none", color: "var(--hv-action-text)",
                fontFamily: S, fontSize: "12px", letterSpacing: "0.15em",
                textTransform: "uppercase", cursor: "pointer",
                transition: "opacity 0.15s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              >
                Submit Proposal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Proposal form */}
      {showForm && (
        <div style={{
          padding: "32px",
          border: "1px solid var(--hv-border2)",
          borderTop: "2px solid var(--hv-rule)",
          marginBottom: "32px",
          background: "var(--hv-bg2)",
        }}>
          <h3 style={{
            fontFamily: S, fontWeight: 400, fontSize: "20px",
            color: "var(--hv-text)", marginBottom: "24px",
          }}>Submit Governance Proposal</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <LabelRow text="Proposal Title" />
              <input
                required maxLength={100}
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Increase Crisis Zone Multiplier to 3×"
                style={fieldStyle}
                onFocus={e => { e.target.style.borderColor = "var(--hv-border-str)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--hv-border3)"; }}
              />
            </div>

            <div>
              <LabelRow text="Description & Rationale" />
              <textarea
                required rows={4}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain the rationale for this proposal and its anticipated effect on the protocol..."
                style={{ ...fieldStyle, resize: "vertical" as const, lineHeight: 1.7 }}
                onFocus={e => { e.target.style.borderColor = "var(--hv-border-str)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--hv-border3)"; }}
              />
            </div>

            <div>
              <LabelRow text="Classification" />
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                style={{ ...fieldStyle, background: "var(--hv-surf)" }}
              >
                <option value="parameter_change">Parameter Change</option>
                <option value="treasury_grant">Treasury Grant</option>
                <option value="protocol_upgrade">Protocol Upgrade</option>
                <option value="emergency_action">Emergency Action</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px", paddingTop: "8px" }}>
              <button type="button" onClick={() => setShowForm(false)} style={{
                flex: 1, padding: "12px",
                background: "transparent",
                border: "1px solid var(--hv-border2)",
                color: "var(--hv-t3)",
                fontFamily: S, fontSize: "12px", letterSpacing: "0.1em",
                textTransform: "uppercase", cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={e => { e.preventDefault(); submitProposal(e as any); }}
                disabled={submitting}
                style={{
                  flex: 2, padding: "12px",
                  background: submitting ? "var(--hv-surf2)" : "var(--hv-action-bg)",
                  border: "none",
                  color: submitting ? "var(--hv-t4)" : "var(--hv-action-text)",
                  fontFamily: S, fontSize: "12px", letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting…" : "File Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "14px", color: "var(--hv-t4)" }}>
            Retrieving governance records…
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && proposals.length === 0 && (
        <div style={{
          padding: "64px 40px", textAlign: "center",
          border: "1px solid var(--hv-border)",
        }}>
          <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "16px", color: "var(--hv-t4)", marginBottom: "8px" }}>
            No active proposals before the Council.
          </p>
          <p style={{ fontFamily: S, fontSize: "12px", color: "var(--hv-t5)" }}>
            {eventCount >= 10
              ? "You have sufficient standing to submit a proposal above."
              : "A minimum of 10 verified impact events is required to submit proposals."}
          </p>
        </div>
      )}

      {/* Proposals */}
      {!loading && proposals.length > 0 && (
        <div style={{
          border: "1px solid var(--hv-border)",
          borderTop: "2px solid var(--hv-border3)",
        }}>
          {proposals.map((p, i) => (
            <div key={p.proposal_id} style={{
              padding: "28px 28px",
              borderBottom: i < proposals.length - 1 ? "1px solid var(--hv-border)" : "none",
              background: p.status === "active" ? "var(--hv-surf)" : "transparent",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <StatusTag status={p.status} />
                    <span style={{
                      fontFamily: M, fontSize: "9px",
                      color: "var(--hv-t4)", letterSpacing: "0.1em",
                    }}>{timeLeft(p.expires_at)}</span>
                  </div>
                  <p style={{
                    fontFamily: S, fontSize: "16px",
                    color: "var(--hv-text)", marginBottom: "6px",
                  }}>{p.title}</p>
                  <p style={{
                    fontFamily: S, fontStyle: "italic", fontSize: "12px",
                    color: "var(--hv-t4)", lineHeight: 1.7,
                  }}>{p.description}</p>
                </div>
              </div>

              {/* Vote bar */}
              <VoteBar forPct={p.support_pct} />

              <div style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: S, fontSize: "11px", color: "var(--hv-t4)",
                marginBottom: p.status === "active" ? "16px" : "0",
              }}>
                <span>In favour: {(p.support_pct * 100).toFixed(1)}% {p.votes_for.toFixed(1)} VP</span>
                <span>{p.voter_count} participants</span>
              </div>

              {p.status === "active" && address && eventCount >= 1 && (
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    { label: "Vote in Favour", vf: true  },
                    { label: "Vote Against",   vf: false },
                  ].map(b => (
                    <button key={b.label}
                      onClick={() => castVote(p.proposal_id, b.vf)}
                      disabled={voting === p.proposal_id}
                      style={{
                        flex: 1, padding: "10px",
                        background: "transparent",
                        border: b.vf ? "1px solid var(--hv-border3)" : "1px solid var(--hv-border)",
                        color: b.vf ? "var(--hv-t2)" : "var(--hv-t4)",
                        fontFamily: S, fontStyle: "italic", fontSize: "11px",
                        letterSpacing: "0.08em",
                        opacity: voting === p.proposal_id ? 0.4 : 1,
                        cursor: voting === p.proposal_id ? "not-allowed" : "pointer",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={ev => { if (!voting) (ev.currentTarget as HTMLButtonElement).style.background = "var(--hv-surf)"; }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >{b.label}</button>
                  ))}
                </div>
              )}
              {p.status === "active" && (!address || eventCount < 1) && (
                <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "var(--hv-t4)" }}>
                  {!address ? "Connect wallet to participate." : "A minimum of 1 verified impact event is required to vote."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}