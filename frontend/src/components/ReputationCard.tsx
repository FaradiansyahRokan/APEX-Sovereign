"use client";

import { useReadContract, useBalance } from "wagmi";
import { REPUTATION_LEDGER_ABI } from "../utils/abis";
import { CONTRACTS, getRank, REPUTATION_RANKS } from "../utils/constants";

interface Props { address: string; reputationScore: number; }

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

const ruled: React.CSSProperties = {
  borderTop: "1px solid var(--hv-border)",
  paddingTop: "20px",
  paddingBottom: "20px",
};

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      ...ruled,
    }}>
      <span style={{
        fontFamily: S, fontSize: "11px", fontStyle: "italic",
        color: "var(--hv-t4)",
      }}>{label}</span>
      <span style={{
        fontFamily: M, fontSize: "13px",
        color: "var(--hv-t2)",
        letterSpacing: "0.03em",
      }}>{value}</span>
    </div>
  );
}

export default function ReputationCard({ address, reputationScore }: Props) {
  const rank = getRank(reputationScore);
  const rIdx = REPUTATION_RANKS.findIndex(r => r.rank === rank.rank);
  const next  = REPUTATION_RANKS[rIdx + 1];
  const pct   = next
    ? Math.min(((reputationScore - rank.threshold) / (next.threshold - rank.threshold)) * 100, 100)
    : 100;

  const { data: rep } = useReadContract({
    address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
    abi: REPUTATION_LEDGER_ABI,
    functionName: "getReputation",
    args: [address as `0x${string}`],
    query: { refetchInterval: 8_000 },
  });

  const { data: havenBalance } = useBalance({
    address: address as `0x${string}`,
    query: { refetchInterval: 8_000 },
  });

  const { data: hist } = useReadContract({
    address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
    abi: REPUTATION_LEDGER_ABI,
    functionName: "getScoreHistory",
    args: [address as `0x${string}`],
    query: { refetchInterval: 8_000 },
  });

  const score   = rep ? Number((rep as any)[0]) / 100 : reputationScore;
  const events  = rep ? Number((rep as any)[1]) : 0;
  const lastUpd = rep ? Number((rep as any)[2]) : 0;
  const havenFmt = havenBalance
    ? Number(havenBalance.formatted).toLocaleString("en-US", { maximumFractionDigits: 4 })
    : "0.0000";
  const history = (hist as any[]) ?? [];
  const recent  = [...history].reverse().slice(0, 5);
  const lastDate = lastUpd > 0
    ? new Date(lastUpd * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "No activity";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>

      {/* ── Hero card ── */}
      <div style={{
        background: "var(--hv-surf)",
        border: "1px solid var(--hv-border)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Heavy top rule */}
        <div style={{ height: "2px", background: "var(--hv-action-bg)" }} />

        <div style={{ padding: "32px 28px" }}>

          {/* Section label */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
            <span style={{
              fontFamily: S, fontSize: "9px", fontStyle: "italic",
              color: "var(--hv-t4)", letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}>Reputation Profile</span>
            <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
          </div>

          {/* Score large display */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{
              fontFamily: S, fontSize: "9px", letterSpacing: "0.2em",
              color: "var(--hv-t4)", textTransform: "uppercase",
              marginBottom: "8px",
            }}>Impact Score</p>
            <p style={{
              fontFamily: M, fontSize: "56px", fontWeight: 400,
              color: "var(--hv-text)", letterSpacing: "-0.04em", lineHeight: 1,
            }}>{score.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
            <p style={{
              fontFamily: S, fontSize: "12px", fontStyle: "italic",
              color: "var(--hv-t4)", marginTop: "6px",
            }}>Designation: <em style={{ color: "var(--hv-t2)" }}>{rank.rank}</em></p>
          </div>

          {/* Address */}
          <div style={{ ...ruled }}>
            <p style={{
              fontFamily: S, fontSize: "9px", letterSpacing: "0.2em",
              color: "var(--hv-t4)", textTransform: "uppercase",
              marginBottom: "6px",
            }}>Wallet Address</p>
            <p style={{
              fontFamily: M, fontSize: "11px",
              color: "var(--hv-t3)", letterSpacing: "0.04em",
              wordBreak: "break-all",
            }}>{address}</p>
          </div>

          {/* Fields */}
          <FieldRow label="Verified Events"  value={events.toString()} />
          <FieldRow label="HAVEN Balance"    value={`${havenFmt} VELD`} />
          <FieldRow label="Last Active"      value={lastDate} />
          <FieldRow label="Status"           value="Verified ✓" />

          {/* Rank progression */}
          <div style={{ ...ruled }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{
                fontFamily: S, fontSize: "11px", fontStyle: "italic",
                color: "var(--hv-t4)",
              }}>
                {next ? `Progress to ${next.rank}` : "Maximum Designation"}
              </span>
              <span style={{
                fontFamily: M, fontSize: "11px",
                color: "var(--hv-t3)",
              }}>{pct.toFixed(1)}%</span>
            </div>
            {/* Progress bar ruled style */}
            <div style={{ height: "1px", background: "var(--hv-surf2)", position: "relative" }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${pct}%`, background: "var(--hv-action-bg)",
                transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
            {next && (
              <p style={{
                fontFamily: S, fontSize: "10px", fontStyle: "italic",
                color: "var(--hv-t4)", marginTop: "6px",
              }}>
                {(next.threshold - score).toLocaleString()} points remaining
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      {recent.length > 0 && (
        <div style={{
          background: "var(--hv-bg2)",
          border: "1px solid var(--hv-border)",
          borderTop: "none",
        }}>
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <span style={{
                fontFamily: S, fontSize: "9px", fontStyle: "italic",
                color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
              }}>Activity Log</span>
              <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
            </div>

            {recent.map((e: any, i: number) => {
              const pts = Number(e.score ?? 0);
              const ts  = Number(e.timestamp ?? 0);
              const d   = ts > 0
                ? new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—";
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  paddingTop: "12px", paddingBottom: "12px",
                  borderTop: i > 0 ? "1px solid var(--hv-border)" : undefined,
                  opacity: 1 - i * 0.12,
                }}>
                  <span style={{ fontFamily: S, fontSize: "12px", fontStyle: "italic", color: "var(--hv-t4)" }}>
                    {d}
                  </span>
                  <span style={{ fontFamily: M, fontSize: "13px", color: "var(--hv-t2)" }}>
                    +{(pts / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} pts
                  </span>
                </div>
              );
            })}

            <p style={{
              fontFamily: S, fontSize: "10px", fontStyle: "italic",
              color: "var(--hv-t4)", marginTop: "16px",
              textAlign: "right",
            }}>
              {history.length} total events on-chain
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {events === 0 && (
        <div style={{
          padding: "48px 28px", textAlign: "center",
          border: "1px solid var(--hv-border)",
          borderTop: "none",
          background: "var(--hv-bg2)",
        }}>
          <p style={{
            fontFamily: S, fontSize: "15px", fontStyle: "italic",
            color: "var(--hv-t4)", marginBottom: "8px",
          }}>No activity on record.</p>
          <p style={{ fontFamily: S, fontSize: "11px", color: "var(--hv-t5)" }}>
            Submit your first impact proof to initialise your reputation ledger.
          </p>
        </div>
      )}
    </div>
  );
}