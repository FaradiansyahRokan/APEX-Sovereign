"use client";

import { useReadContract } from "wagmi";
import { REPUTATION_LEDGER_ABI } from "../utils/abis";
import { CONTRACTS } from "../utils/constants";

const BADGES = [
  { id: 1, symbol: "I",    name: "First Step",   desc: "Submitted your first impact proof",        tier: "foundational" },
  { id: 2, symbol: "II",   name: "Helper",        desc: "Completed 5 verified impact events",       tier: "foundational" },
  { id: 3, symbol: "III",  name: "Dedicated",     desc: "Completed 10 verified impact events",      tier: "distinguished" },
  { id: 4, symbol: "IV",   name: "Champion",      desc: "Completed 25 verified impact events",      tier: "distinguished" },
  { id: 5, symbol: "V",    name: "Legend",        desc: "Completed 50 verified impact events",      tier: "eminent"      },
  { id: 6, symbol: "VI",   name: "High Impact",   desc: "Impact score 80+ in a single event",       tier: "distinguished" },
  { id: 7, symbol: "VII",  name: "Perfect",       desc: "Achieved a perfect 100 impact score",      tier: "eminent"      },
  { id: 8, symbol: "VIII", name: "Century",       desc: "10,000+ cumulative impact points",         tier: "sovereign"    },
  { id: 9, symbol: "IX",   name: "Titan",         desc: "50,000+ cumulative impact points",         tier: "sovereign"    },
];

const TIER_STYLE: Record<string, { borderOpacity: string; textOpacity: string; label: string }> = {
  foundational: { borderOpacity: "0.1",  textOpacity: "0.5",  label: "Foundational" },
  distinguished:{ borderOpacity: "0.18", textOpacity: "0.7",  label: "Distinguished" },
  eminent:      { borderOpacity: "0.28", textOpacity: "0.85", label: "Eminent"      },
  sovereign:    { borderOpacity: "0.5",  textOpacity: "0.95", label: "Sovereign"    },
};

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

function fmtDate(ts: number) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function BadgeCard({ b, earned, at }: { b: typeof BADGES[0]; earned: boolean; at: number }) {
  const t = TIER_STYLE[b.tier];
  return (
    <div style={{
      padding: "24px 20px",
      border: `1px solid rgba(255,255,255,${earned ? t.borderOpacity : "0.04"})`,
      background: earned ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.005)",
      opacity: earned ? 1 : 0.35,
      position: "relative",
      transition: "border-color 0.2s, background 0.2s",
      cursor: "default",
    }}
      onMouseEnter={e => {
        if (!earned) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = earned ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.005)";
      }}
    >
      {/* Top rule for earned */}
      {earned && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "1px",
          background: `rgba(255,255,255,${t.borderOpacity})`,
        }} />
      )}

      {/* Roman numeral — large display */}
      <p style={{
        fontFamily: S, fontStyle: "italic",
        fontSize: "36px", fontWeight: 400,
        color: earned ? `rgba(255,255,255,${t.textOpacity})` : "rgba(255,255,255,0.08)",
        lineHeight: 1, marginBottom: "16px",
        letterSpacing: "0.03em",
      }}>{b.symbol}</p>

      {/* Tier tag */}
      <p style={{
        fontFamily: S, fontSize: "8px", fontStyle: "italic",
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: earned ? `rgba(255,255,255,${t.textOpacity})` : "rgba(255,255,255,0.12)",
        marginBottom: "8px",
      }}>
        {earned ? t.label : "Locked"}
      </p>

      {/* Name */}
      <p style={{
        fontFamily: S, fontSize: "14px",
        color: earned ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
        marginBottom: "6px",
      }}>{b.name}</p>

      {/* Desc */}
      <p style={{
        fontFamily: S, fontStyle: "italic", fontSize: "11px",
        color: "rgba(255,255,255,0.3)", lineHeight: 1.6,
        marginBottom: earned && at > 0 ? "12px" : "0",
      }}>{b.desc}</p>

      {/* Earned date */}
      {earned && at > 0 && (
        <p style={{
          fontFamily: M, fontSize: "9px",
          color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "10px", marginTop: "10px",
        }}>Awarded {fmtDate(at)}</p>
      )}
    </div>
  );
}

export default function Badges({ address }: { address: string }) {
  const { data: ids } = useReadContract({
    address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
    abi: REPUTATION_LEDGER_ABI,
    functionName: "getBadges",
    args: [address as `0x${string}`],
    query: { refetchInterval: 8_000 },
  });
  const { data: all } = useReadContract({
    address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
    abi: REPUTATION_LEDGER_ABI,
    functionName: "getAllBadges",
    args: [address as `0x${string}`],
    query: { refetchInterval: 8_000 },
  });

  const earned = new Set((ids as number[] | undefined)?.map(Number) ?? []);
  const atMap: Record<number, number> = {};
  if (all) (all as any[]).forEach(b => { atMap[Number(b.id)] = Number(b.earnedAt); });

  const n   = earned.size;
  const pct = Math.round((n / BADGES.length) * 100);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Honours &amp; Distinctions</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>

        <h2 style={{
          fontFamily: S, fontWeight: 400, fontSize: "30px",
          color: "#fff", letterSpacing: "0.01em", marginBottom: "8px",
        }}>
          {n} <span style={{ fontSize: "20px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>of {BADGES.length} conferred</span>
        </h2>

        {/* Progress */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{
              fontFamily: S, fontSize: "11px", fontStyle: "italic",
              color: "rgba(255,255,255,0.35)",
            }}>Completion</span>
            <span style={{
              fontFamily: M, fontSize: "11px",
              color: "rgba(255,255,255,0.5)",
            }}>{pct}%</span>
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", position: "relative" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${pct}%`, background: "#fff",
              transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
        </div>
      </div>

      {/* Tier legend */}
      <div style={{
        display: "flex", gap: "32px", flexWrap: "wrap",
        paddingBottom: "24px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        marginBottom: "28px",
      }}>
        {Object.entries(TIER_STYLE).map(([key, t]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "24px", height: "1px",
              background: `rgba(255,255,255,${t.borderOpacity})`,
            }} />
            <span style={{
              fontFamily: S, fontStyle: "italic", fontSize: "11px",
              color: "rgba(255,255,255,0.35)",
            }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Badge grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "1px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {BADGES.map(b => (
          <div key={b.id} style={{ background: "#030303" }}>
            <BadgeCard b={b} earned={earned.has(b.id)} at={atMap[b.id] ?? 0} />
          </div>
        ))}
      </div>
    </div>
  );
}