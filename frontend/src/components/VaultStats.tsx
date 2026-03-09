"use client";

import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { BENEVOLENCE_VAULT_ABI, REPUTATION_LEDGER_ABI } from "../utils/abis";
import { CONTRACTS } from "../utils/constants";
import { useEffect, useRef } from "react";

function AnimNum({ to, dec = 0 }: { to: number; dec?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    if (!ref.current || to === prev.current) return;
    const s = prev.current, e = to, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 1400, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      if (ref.current) ref.current.textContent = (s + (e - s) * ease).toLocaleString("en-US", { maximumFractionDigits: dec });
      if (p < 1) requestAnimationFrame(tick); else prev.current = e;
    };
    requestAnimationFrame(tick);
  }, [to, dec]);
  return <span ref={ref}>{to.toLocaleString("en-US", { maximumFractionDigits: dec })}</span>;
}

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

const STATS_META = [
  { roman: "I", abbr: "EVT" },
  { roman: "II", abbr: "VOL" },
  { roman: "III", abbr: "HVN" },
  { roman: "IV", abbr: "IMP" },
];

export default function VaultStats() {
  const { data } = useReadContracts({
    contracts: [
      { address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`, abi: BENEVOLENCE_VAULT_ABI, functionName: "getStats" },
      { address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`, abi: REPUTATION_LEDGER_ABI, functionName: "getGlobalStats" },
    ],
    query: { refetchInterval: 8_000 },
  });

  const vault = data?.[0]?.result as readonly [bigint, bigint, bigint, bigint] | undefined;
  const global = data?.[1]?.result as readonly [bigint, bigint] | undefined;

  const stats = [
    { label: "Events Verified", value: vault ? Number(vault[2]) : null, dec: 0 },
    { label: "Volunteers", value: global ? Number(global[0]) : null, dec: 0 },
    { label: "HAVEN Distributed", value: vault ? Number(formatUnits(vault[1], 18)) : null, dec: 2 },
    { label: "Total Impact", value: global ? Number(global[1]) / 100 : null, dec: 0 },
  ];

  return (
    <div style={{ position: "relative" }}>
      {/* Heavy top rule */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "var(--hv-action-bg)" }} />

      <div className="vs-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderLeft: "1px solid var(--hv-border)",
      }}>
        {stats.map((s, i) => {
          const meta = STATS_META[i];
          return (
            <div key={s.label} style={{
              padding: "36px 32px 32px",
              borderRight: "1px solid var(--hv-border)",
              position: "relative",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--hv-bg2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              {/* Roman numeral tag */}
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                marginBottom: "20px",
              }}>
                <span style={{
                  fontFamily: S, fontSize: "10px", fontStyle: "italic",
                  color: "var(--hv-t4)", letterSpacing: "0.05em",
                }}>{meta.roman}</span>
                <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
                <span style={{
                  fontFamily: M, fontSize: "8px",
                  color: "var(--hv-t4)", letterSpacing: "0.2em",
                }}>{meta.abbr}</span>
              </div>

              {/* Label */}
              <p style={{
                fontFamily: S, fontSize: "10px", fontStyle: "italic",
                color: "var(--hv-t4)", letterSpacing: "0.06em",
                marginBottom: "10px",
              }}>{s.label}</p>

              {/* Value */}
              <p style={{
                fontFamily: M, fontSize: "30px", fontWeight: 400,
                color: s.value !== null ? "var(--hv-text)" : "var(--hv-t5)",
                letterSpacing: "-0.03em", lineHeight: 1,
              }}>
                {s.value !== null
                  ? <AnimNum to={s.value} dec={s.dec} />
                  : <span style={{ fontFamily: S, fontStyle: "italic", fontSize: "14px" }}>Awaiting chain…</span>
                }
              </p>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .vs-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .vs-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}