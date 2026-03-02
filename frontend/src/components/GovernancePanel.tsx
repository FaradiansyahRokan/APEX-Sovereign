"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { ENV } from "../utils/env";

const ORACLE_API = ENV.ORACLE_URL;
const API_KEY = ENV.SATIN_API_KEY || "apex-dev-key-change-in-prod";

function hFetch(path: string, opts?: RequestInit) {
    return fetch(`${ORACLE_API}${path}`, {
        ...opts,
        headers: { "X-APEX-Oracle-Key": API_KEY, "Content-Type": "application/json", ...opts?.headers },
    });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Proposal {
    proposal_id: string;
    proposer: string;
    title: string;
    description: string;
    proposal_type: string;
    status: string;
    votes_for: number;
    votes_against: number;
    support_pct: number;
    voter_count: number;
    expires_at: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, [string, string]> = {
        active: ["var(--mi)", "var(--mi-dim)"],
        passed: ["#6bff9e", "rgba(107,255,158,0.15)"],
        rejected: ["#ff6b6b", "rgba(255,107,107,0.15)"],
        expired: ["var(--t2)", "rgba(255,255,255,0.05)"],
    };
    const [fg, bg] = colors[status] || colors.active;
    return (
        <span style={{
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
            padding: "3px 8px", borderRadius: "99px",
            color: fg, background: bg, textTransform: "uppercase",
        }}>{status}</span>
    );
}

function VoteBar({ forPct }: { forPct: number }) {
    return (
        <div style={{ height: "4px", borderRadius: "2px", background: "var(--g1)", overflow: "hidden", margin: "8px 0" }}>
            <div style={{
                height: "100%", borderRadius: "2px",
                width: `${forPct * 100}%`,
                background: forPct >= 0.51
                    ? "linear-gradient(90deg, var(--mi), #6bff9e)"
                    : "linear-gradient(90deg, #ff6b6b, #ff9f43)",
                transition: "width 0.6s ease",
            }} />
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GovernancePanel({ reputationScore, eventCount }: { reputationScore: number, eventCount: number }) {
    const { address } = useAccount();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingPower, setVotingPower] = useState(0);
    const [voting, setVoting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: "", description: "", type: "parameter_change" });
    const [submitting, setSubmitting] = useState(false);

    const { data: nativeBalance } = useBalance({
        address: address as `0x${string}`,
        query: { enabled: !!address, refetchInterval: 8_000 },
    });

    useEffect(() => {
        loadProposals();
        loadVotingPower();
    }, [address, eventCount, nativeBalance, loadProposals, loadVotingPower]);

    async function loadProposals() {
        setLoading(true);
        try {
            const r = await hFetch("/api/v1/governance/proposals");
            const d = await r.json();
            setProposals(d.proposals || []);
        } catch {
            setError("Failed to load proposals");
        } finally {
            setLoading(false);
        }
    }

    async function loadVotingPower() {
        if (!address) return;
        try {
            const tokenHeld = nativeBalance ? Number(nativeBalance.formatted) : 0;
            const r = await hFetch(
                `/api/v1/governance/voting-power?impact_events=${eventCount}&tenure_days=0&token_held=${tokenHeld}`
            );
            const d = await r.json();
            setVotingPower(d.voting_power || 0);
        } catch { /* ignore */ }
    }

    async function castVote(proposalId: string, voteFor: boolean) {
        if (!address) return;
        setVoting(proposalId);
        try {
            const tokenHeld = nativeBalance ? Number(nativeBalance.formatted) : 0;
            const r = await hFetch("/api/v1/governance/vote", {
                method: "POST",
                body: JSON.stringify({
                    proposal_id: proposalId,
                    voter_address: address,
                    vote_for: voteFor,
                    impact_events: eventCount,
                    tenure_days: 0,
                    token_held_apex: tokenHeld,
                }),
            });
            if (!r.ok) {
                const e = await r.json();
                alert(e.detail || "Vote failed");
            } else {
                await loadProposals();
            }
        } catch {
            alert("Vote failed — oracle connection error");
        } finally {
            setVoting(null);
        }
    }

    async function submitProposal(e: React.FormEvent) {
        e.preventDefault();
        if (!address) return;
        if (eventCount < 10) return alert("Need at least 10 verified impact events to create a proposal.");

        setSubmitting(true);
        try {
            const r = await hFetch("/api/v1/governance/propose", {
                method: "POST",
                body: JSON.stringify({
                    proposer: address,
                    title: formData.title,
                    description: formData.description,
                    proposal_type: formData.type,
                    impact_events: eventCount,
                }),
            });
            if (!r.ok) {
                const err = await r.json();
                alert(err.detail || "Proposal creation failed");
            } else {
                setShowForm(false);
                setFormData({ title: "", description: "", type: "parameter_change" });
                await loadProposals();
            }
        } catch {
            alert("Proposal creation failed — oracle connection error");
        } finally {
            setSubmitting(false);
        }
    }

    const timeLeft = (expiresAt: number) => {
        const diff = expiresAt - Math.floor(Date.now() / 1000);
        if (diff <= 0) return "Expired";
        const d = Math.floor(diff / 86400);
        return d > 0 ? `${d}d left` : `${Math.floor(diff / 3600)}h left`;
    };

    return (
        <div style={{ maxWidth: "780px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--t0)", margin: 0 }}>
                        Governance DAO
                    </h2>
                    <p style={{ fontSize: "12px", color: "var(--t2)", marginTop: "4px" }}>
                        Quadratic Benevolence Voting — power = √events × tenure + √tokens × 0.3
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {address && eventCount >= 10 && !showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            style={{
                                padding: "8px 16px", borderRadius: "var(--r1)",
                                background: "var(--mi)", color: "#000", fontWeight: 700,
                                border: "none", cursor: "pointer", fontSize: "13px"
                            }}
                        >
                            + Create Proposal
                        </button>
                    )}
                    {address && (
                        <div style={{
                            padding: "8px 16px", borderRadius: "var(--r1)",
                            background: "var(--vi-dim)", border: "1px solid var(--vi-edge)",
                        }}>
                            <p style={{ fontSize: "10px", color: "var(--t2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Your Power</p>
                            <p style={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: "18px",
                                fontWeight: 700, color: "var(--vi)", marginTop: "2px",
                            }}>{votingPower.toFixed(2)}</p>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div style={{ padding: "12px 16px", borderRadius: "var(--r2)", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", marginBottom: "16px" }}>
                    <p style={{ fontSize: "13px", color: "#ff6b6b" }}>{error}</p>
                </div>
            )}

            {showForm && (
                <form onSubmit={submitProposal} style={{
                    padding: "24px", borderRadius: "var(--r3)", background: "var(--g1)",
                    border: "1px solid var(--mi)", marginBottom: "24px",
                    display: "flex", flexDirection: "column", gap: "16px"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--t0)", margin: 0 }}>Create Governance Proposal</h3>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--t2)", marginBottom: "6px" }}>Proposal Title</label>
                        <input
                            required maxLength={100}
                            value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                            style={{
                                width: "100%", padding: "10px", borderRadius: "var(--r1)",
                                background: "var(--g0)", border: "1px solid var(--b0)", color: "var(--t0)"
                            }}
                            placeholder="e.g. Increase Crisis Zone Multiplier to 3x"
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--t2)", marginBottom: "6px" }}>Description & Rationale</label>
                        <textarea
                            required rows={4}
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                            style={{
                                width: "100%", padding: "10px", borderRadius: "var(--r1)",
                                background: "var(--g0)", border: "1px solid var(--b0)", color: "var(--t0)",
                                resize: "vertical"
                            }}
                            placeholder="Explain why this change is necessary and how it benefits the protocol..."
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--t2)", marginBottom: "6px" }}>Proposal Type</label>
                        <select
                            value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                            style={{
                                width: "100%", padding: "10px", borderRadius: "var(--r1)",
                                background: "var(--g0)", border: "1px solid var(--b0)", color: "var(--t0)"
                            }}
                        >
                            <option value="parameter_change">Parameter Change</option>
                            <option value="treasury_grant">Treasury Grant</option>
                            <option value="protocol_upgrade">Protocol Upgrade</option>
                            <option value="emergency_action">Emergency Action</option>
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                        <button
                            type="button" onClick={() => setShowForm(false)}
                            style={{
                                flex: 1, padding: "10px", borderRadius: "var(--r1)",
                                background: "transparent", border: "1px solid var(--b0)",
                                color: "var(--t2)", cursor: "pointer", fontWeight: 600
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit" disabled={submitting}
                            style={{
                                flex: 2, padding: "10px", borderRadius: "var(--r1)",
                                background: "var(--mi)", border: "none",
                                color: "#000", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 700,
                                opacity: submitting ? 0.7 : 1
                            }}
                        >
                            {submitting ? "Submitting..." : "Submit Proposal"}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--t2)" }}>
                    <p style={{ fontSize: "13px" }}>Loading proposals…</p>
                </div>
            ) : proposals.length === 0 ? (
                <div style={{
                    padding: "48px", textAlign: "center",
                    borderRadius: "var(--r3)", background: "var(--g1)", border: "1px solid var(--b0)",
                }}>
                    <p style={{ fontSize: "40px", marginBottom: "12px" }}>🗳️</p>
                    <p style={{ fontWeight: 700, color: "var(--t0)", marginBottom: "8px" }}>No Active Proposals</p>
                    <p style={{ fontSize: "13px", color: "var(--t2)" }}>
                        {eventCount >= 10
                            ? "You have enough power. Click '+ Create Proposal' above to start."
                            : "Need ≥10 verified impact events to create a proposal."}
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {proposals.map(p => (
                        <div key={p.proposal_id} style={{
                            padding: "20px", borderRadius: "var(--r3)",
                            background: "var(--g1)", border: "1px solid var(--b0)",
                        }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                        <StatusBadge status={p.status} />
                                        <span style={{ fontSize: "10px", color: "var(--t2)" }}>{timeLeft(p.expires_at)}</span>
                                    </div>
                                    <p style={{ fontWeight: 700, color: "var(--t0)", fontSize: "14px" }}>{p.title}</p>
                                    <p style={{ fontSize: "12px", color: "var(--t2)", marginTop: "4px", lineHeight: 1.6 }}>{p.description}</p>
                                </div>
                            </div>

                            <VoteBar forPct={p.support_pct} />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--t2)", marginBottom: "12px" }}>
                                <span>For: {(p.support_pct * 100).toFixed(1)}% — {p.votes_for.toFixed(1)}VP</span>
                                <span>{p.voter_count} voters</span>
                            </div>

                            {p.status === "active" && address && eventCount >= 1 && (
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        onClick={() => castVote(p.proposal_id, true)}
                                        disabled={voting === p.proposal_id}
                                        style={{
                                            flex: 1, padding: "8px", borderRadius: "var(--r1)",
                                            background: "rgba(107,255,158,0.1)", border: "1px solid rgba(107,255,158,0.3)",
                                            color: "#6bff9e", fontWeight: 600, cursor: "pointer", fontSize: "12px",
                                            opacity: voting === p.proposal_id ? 0.5 : 1,
                                        }}
                                    >✓ Support</button>
                                    <button
                                        onClick={() => castVote(p.proposal_id, false)}
                                        disabled={voting === p.proposal_id}
                                        style={{
                                            flex: 1, padding: "8px", borderRadius: "var(--r1)",
                                            background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
                                            color: "#ff6b6b", fontWeight: 600, cursor: "pointer", fontSize: "12px",
                                            opacity: voting === p.proposal_id ? 0.5 : 1,
                                        }}
                                    >✗ Oppose</button>
                                </div>
                            )}
                            {p.status === "active" && (!address || eventCount < 1) && (
                                <p style={{ fontSize: "11px", color: "var(--t2)", textAlign: "center" }}>
                                    {!address ? "Connect wallet to vote" : "Need ≥1 verified impact event to vote"}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
