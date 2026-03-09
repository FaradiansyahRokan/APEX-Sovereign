"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { REPUTATION_LEDGER_ABI } from "../utils/abis";
import { CONTRACTS, getRank } from "../utils/constants";

interface Entry { address: string; score: number; rank: number; }

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

const ORDINALS = ["I", "II", "III"];

export default function Leaderboard() {
  const [page, setPage] = useState(0);
  const PAGE = 10;

  const { data: total } = useReadContract({
    address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
    abi: REPUTATION_LEDGER_ABI,
    functionName: "getLeaderboardLength",
    query: { refetchInterval: 10_000 },
  });
  const { data: pageData, isLoading } = useReadContract({
    address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
    abi: REPUTATION_LEDGER_ABI,
    functionName: "getLeaderboardPage",
    args: [BigInt(page * PAGE), BigInt(PAGE)],
    query: { refetchInterval: 10_000 },
  });
  const { data: globalStats } = useReadContract({
    address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
    abi: REPUTATION_LEDGER_ABI,
    functionName: "getGlobalStats",
    query: { refetchInterval: 10_000 },
  });

  const addrs  = (pageData as any)?.[0] ?? [];
  const scores = (pageData as any)?.[1] ?? [];
  const totalN = Number(total ?? 0);
  const pages  = Math.ceil(totalN / PAGE);

  const entries: Entry[] = addrs.map((a: string, i: number) => ({
    address: a, score: Number(scores[i] ?? 0n), rank: page * PAGE + i + 1,
  })).sort((a: Entry, b: Entry) => b.score - a.score);

  const podium = [entries[0], entries[1], entries[2]];

  return (
    <div style={{ maxWidth: "820px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Classification</span>
          <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
        </div>
        <h2 style={{
          fontFamily: S, fontWeight: 400, fontSize: "30px",
          color: "var(--hv-text)", letterSpacing: "0.01em",
        }}>Reputation Standings</h2>
        <p style={{
          fontFamily: S, fontStyle: "italic", fontSize: "13px",
          color: "var(--hv-t4)", marginTop: "6px",
        }}>
          {totalN > 0 ? `${totalN.toLocaleString()} participants ranked by cumulative impact score` : "Global ranking ledger"}
        </p>
      </div>

      {/* Global stats */}
      {globalStats && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          borderTop: "2px solid var(--hv-rule)",
          borderLeft: "1px solid var(--hv-border)",
          marginBottom: "40px",
        }}>
          {[
            { label: "Total Participants",   value: Number((globalStats as any)[0]).toLocaleString() },
            { label: "Aggregate Impact",     value: (Number((globalStats as any)[1]) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 }) },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: "24px 28px",
              borderRight: "1px solid var(--hv-border)",
            }}>
              <p style={{
                fontFamily: S, fontSize: "10px", fontStyle: "italic",
                color: "var(--hv-t4)", letterSpacing: "0.1em", marginBottom: "8px",
              }}>{s.label}</p>
              <p style={{
                fontFamily: M, fontSize: "28px",
                color: "var(--hv-text)", letterSpacing: "-0.02em",
              }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Podium top 3 */}
      {!isLoading && entries.length >= 3 && page === 0 && (
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <span style={{
              fontFamily: S, fontSize: "10px", fontStyle: "italic",
              color: "var(--hv-t4)", letterSpacing: "0.15em", textTransform: "uppercase",
            }}>Distinguished Standing</span>
            <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            borderTop: "1px solid var(--hv-border2)",
            borderLeft: "1px solid var(--hv-border)",
          }}>
            {podium.map((entry, i) => {
              if (!entry) return null;
              const rep = getRank(entry.score / 100);
              return (
                <div key={entry.address} style={{
                  padding: "28px 24px",
                  borderRight: "1px solid var(--hv-border)",
                  borderBottom: "1px solid var(--hv-border)",
                  background: i === 0 ? "var(--hv-surf)" : "transparent",
                  position: "relative",
                }}>
                  {i === 0 && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                      background: "var(--hv-action-bg)",
                    }} />
                  )}
                  <p style={{
                    fontFamily: S, fontStyle: "italic", fontSize: "11px",
                    color: "var(--hv-t4)", letterSpacing: "0.15em",
                    marginBottom: "12px",
                  }}>Rank {ORDINALS[i]}</p>
                  <p style={{
                    fontFamily: S, fontSize: "12px",
                    color: "var(--hv-t3)", marginBottom: "4px",
                  }}>{rep.rank}</p>
                  <p style={{
                    fontFamily: M, fontSize: "11px",
                    color: "var(--hv-t4)", marginBottom: "14px",
                  }}>{entry.address.slice(0, 8)}…{entry.address.slice(-6)}</p>
                  <p style={{
                    fontFamily: M, fontSize: i === 0 ? "26px" : "22px",
                    color: i === 0 ? "var(--hv-text)" : "var(--hv-t2)",
                    letterSpacing: "-0.02em",
                  }}>
                    {(entry.score / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                  <p style={{
                    fontFamily: S, fontSize: "10px", fontStyle: "italic",
                    color: "var(--hv-t4)", marginTop: "4px",
                  }}>impact pts</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{
            fontFamily: S, fontStyle: "italic", fontSize: "14px",
            color: "var(--hv-t4)",
          }}>Retrieving ledger data…</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && entries.length === 0 && (
        <div style={{
          padding: "80px 40px", textAlign: "center",
          border: "1px solid var(--hv-border)",
        }}>
          <p style={{
            fontFamily: S, fontStyle: "italic", fontSize: "16px",
            color: "var(--hv-t4)", marginBottom: "8px",
          }}>The ledger is empty.</p>
          <p style={{ fontFamily: S, fontSize: "12px", color: "var(--hv-t5)" }}>
            Submit your first impact proof to initialise the global ranking.
          </p>
        </div>
      )}

      {/* Full table */}
      {!isLoading && entries.length > 0 && (
        <div style={{
          border: "1px solid var(--hv-border)",
          borderTop: "2px solid var(--hv-border3)",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "56px 1fr 160px 120px",
            padding: "12px 24px",
            borderBottom: "1px solid var(--hv-border)",
            background: "var(--hv-bg2)",
          }}>
            {["No.", "Address", "Designation", "Score"].map((h, i) => (
              <p key={h} style={{
                fontFamily: S, fontSize: "9px", fontStyle: "italic",
                color: "var(--hv-t4)", letterSpacing: "0.1em",
                textAlign: i === 3 ? "right" : "left",
              }}>{h}</p>
            ))}
          </div>

          {entries.map((e, i) => {
            const rep   = getRank(e.score / 100);
            const isTop = e.rank <= 3;
            return (
              <div key={e.address}
                style={{
                  display: "grid", gridTemplateColumns: "56px 1fr 160px 120px",
                  padding: "14px 24px", alignItems: "center",
                  borderBottom: i < entries.length - 1 ? "1px solid var(--hv-border)" : "none",
                  background: isTop ? "var(--hv-surf)" : "transparent",
                  transition: "background 0.12s",
                  cursor: "default",
                }}
                onMouseEnter={ev => (ev.currentTarget as HTMLDivElement).style.background = "var(--hv-bg2)"}
                onMouseLeave={ev => (ev.currentTarget as HTMLDivElement).style.background = isTop ? "var(--hv-surf)" : "transparent"}
              >
                {/* Rank */}
                <p style={{
                  fontFamily: isTop ? S : M,
                  fontSize: isTop ? "12px" : "11px",
                  fontStyle: isTop ? "italic" : "normal",
                  color: isTop ? "var(--hv-t2)" : "var(--hv-t4)",
                }}>{isTop ? ORDINALS[e.rank - 1] : `#${e.rank}`}</p>

                {/* Address */}
                <p style={{
                  fontFamily: M, fontSize: "11px",
                  color: "var(--hv-t3)", letterSpacing: "0.04em",
                }}>{e.address.slice(0, 12)}…{e.address.slice(-8)}</p>

                {/* Tier */}
                <p style={{
                  fontFamily: S, fontSize: "11px", fontStyle: "italic",
                  color: "var(--hv-t3)",
                }}>{rep.rank}</p>

                {/* Score */}
                <p style={{
                  fontFamily: M, fontSize: "14px",
                  color: isTop ? "var(--hv-text)" : "var(--hv-t2)",
                  textAlign: "right",
                  letterSpacing: "-0.01em",
                }}>
                  {(e.score / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
              </div>
            );
          })}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 24px",
              borderTop: "1px solid var(--hv-border)",
              background: "var(--hv-bg2)",
            }}>
              <p style={{
                fontFamily: S, fontStyle: "italic", fontSize: "11px",
                color: "var(--hv-t4)",
              }}>
                Page {page + 1} of {pages} · {totalN} total entries
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { label: "← Previous", dis: page === 0,        fn: () => setPage(p => p - 1) },
                  { label: "Next →",     dis: page >= pages - 1, fn: () => setPage(p => p + 1) },
                ].map(b => (
                  <button key={b.label} onClick={b.fn} disabled={b.dis}
                    style={{
                      padding: "8px 18px",
                      background: "transparent",
                      border: "1px solid var(--hv-border2)",
                      fontFamily: S, fontSize: "11px", fontStyle: "italic",
                      color: b.dis ? "var(--hv-t4)" : "var(--hv-t2)",
                      opacity: b.dis ? 0.5 : 1,
                      cursor: b.dis ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={ev => { if (!b.dis) (ev.currentTarget as HTMLButtonElement).style.background = "var(--hv-surf2)"; }}
                    onMouseLeave={ev => { (ev.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}