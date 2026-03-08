"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { REPUTATION_LEDGER_ABI } from "@/utils/abis";
import { CONTRACTS } from "@/utils/constants";
import SubmitImpactForm from "@/components/SubmitImpactForm";
import ReputationCard from "@/components/ReputationCard";
import Leaderboard from "@/components/Leaderboard";
import VaultStats from "@/components/VaultStats";
import ImpactFeed from "@/components/Impactfeed";
import Badges from "@/components/Badges";
import P2PTransfer from "@/components/P2ptransfer";
import CommunityStream from "@/components/CommunityStream";
import GovernancePanel from "@/components/GovernancePanel";
import EconomyDashboard from "@/components/EconomyDashboard";
import ProtocolStatus from "@/components/ProtocolStatus";
import ErrorBoundary from "@/components/ErrorBoundary";
import MintIdentityCard from "@/components/MintIdentityCard";
import { SOVEREIGN_ID_ABI } from "@/utils/abis";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";

/* ─── Animated Number ─── */
function AnimatedNumber({ value, isFloat = false }: { value: number; isFloat?: boolean }) {
  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (latest) => {
    if (isFloat) return latest.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return Math.round(latest).toLocaleString();
  });
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.8, ease: "easeOut" });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{formatted}</motion.span>;
}

type TabId = "submit" | "governance" | "economy" | "protocol" | "profile" | "feed" | "badges" | "leaderboard" | "transfer" | "stream";

const TABS: { id: TabId; label: string; roman: string }[] = [
  { id: "submit", label: "Submit Proof", roman: "I" },
  { id: "governance", label: "Governance", roman: "II" },
  { id: "economy", label: "Economy", roman: "III" },
  { id: "protocol", label: "Protocol", roman: "IV" },
  { id: "profile", label: "Profile", roman: "V" },
  { id: "stream", label: "Community Stream", roman: "VI" },
  { id: "feed", label: "Impact Feed", roman: "VII" },
  { id: "badges", label: "Badges", roman: "VIII" },
  { id: "leaderboard", label: "Leaderboard", roman: "IX" },
  { id: "transfer", label: "P2P Transfer", roman: "X" },
];

/* ─── Ticker tape ─── */
const TICKER_ITEMS = [
  "HAVEN Protocol v2.0.0",
  "PoBA Consensus Active",
  "ZK Shield Operational",
  "Oracle Network Online",
  "Governance Epoch 14",
  "Impact Verification Layer: LIVE",
];

function Ticker() {
  return (
    <div style={{
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(0,0,0,0.6)",
      overflow: "hidden", height: "28px",
      display: "flex", alignItems: "center",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0",
        animation: "tickerScroll 28s linear infinite",
        whiteSpace: "nowrap",
      }}>
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "10px", letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            padding: "0 32px",
            borderRight: "1px solid rgba(255,255,255,0.1)",
          }}>{item}</span>
        ))}
      </div>
      <style>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ─── Masthead Logo ─── */
function Masthead() {
  return (
    <header style={{
      borderBottom: "1px solid rgba(255,255,255,0.12)",
      padding: "0 48px",
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(20px)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Top rule */}
      <div style={{ height: "3px", background: "#fff", marginBottom: "0", position: "absolute", top: 0, left: 0, right: 0 }} />

      <div style={{
        maxWidth: "1320px", margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "72px",
      }}>
        {/* Left meta (Hidden on mobile) */}
        <div className="masthead-meta" style={{ display: "flex", flexDirection: "column" }}>
          <p style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "9px", letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
            marginBottom: "3px",
          }}>Decentralized · Quantitative · Institutional</p>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.15)", marginBottom: "4px" }} />
          <p style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "9px", letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
          }}>Est. 2024 · Chain ID 777000</p>
        </div>

        {/* Center wordmark */}
        <div style={{ textAlign: "center", flex: 1 }}>
          <h1 style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontWeight: 400, fontSize: "22px",
            color: "#fff", letterSpacing: "0.28em",
            textTransform: "uppercase", lineHeight: 1,
          }}>Haven Humanity</h1>
          <p style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "8px", letterSpacing: "0.35em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase", marginTop: "5px",
          }}>Proof-of-Benevolent-Action Protocol</p>
        </div>

        {/* Right: wallet */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}

/* ─── Ruled section header ─── */
function SectionRule({ roman, title, subtitle }: { roman: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "14px" }}>
        <span style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "11px", letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
          flexShrink: 0,
        }}>§ {roman}</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
      </div>
      <h2 style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontWeight: 400, fontSize: "28px",
        color: "#fff", letterSpacing: "0.02em", lineHeight: 1.2,
        marginBottom: "8px",
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "13px", color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.03em", fontStyle: "italic",
        }}>{subtitle}</p>
      )}
    </div>
  );
}

/* ─── Metric tile ─── */
function MetricTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.12)",
      paddingTop: "20px",
      paddingBottom: "20px",
    }}>
      <p style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontSize: "9px", letterSpacing: "0.22em",
        color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
        marginBottom: "10px",
      }}>{label}</p>
      <p style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontSize: "32px", fontWeight: 400,
        color: "#fff", letterSpacing: "-0.01em",
        lineHeight: 1,
      }}>{value}</p>
      {note && (
        <p style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "11px", color: "rgba(255,255,255,0.3)",
          fontStyle: "italic", marginTop: "6px",
          letterSpacing: "0.03em",
        }}>{note}</p>
      )}
    </div>
  );
}

/* ─── Allocation bar row ─── */
function AllocRow({ label, pct, note }: { label: string; pct: number; note: string }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "12px", letterSpacing: "0.06em",
          color: "rgba(255,255,255,0.7)",
        }}>{label}</span>
        <span style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "12px", color: "rgba(255,255,255,0.4)",
          fontStyle: "italic",
        }}>{note}</span>
      </div>
      <div style={{
        height: "1px", background: "rgba(255,255,255,0.08)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: "#fff",
          transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <p style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontSize: "10px", color: "rgba(255,255,255,0.25)",
        marginTop: "4px", letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>{pct}%</p>
    </div>
  );
}

/* ─── Strategy principle row ─── */
function PrincipleRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "40px 1fr",
      gap: "20px", paddingTop: "20px", paddingBottom: "20px",
      borderTop: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontSize: "11px", color: "rgba(255,255,255,0.22)",
        letterSpacing: "0.1em", paddingTop: "2px",
      }}>{n}.</span>
      <div>
        <p style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontWeight: 400, fontSize: "14px",
          color: "rgba(255,255,255,0.9)", marginBottom: "6px",
          letterSpacing: "0.02em",
        }}>{title}</p>
        <p style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "12px", color: "rgba(255,255,255,0.4)",
          lineHeight: 1.7, fontStyle: "italic",
        }}>{body}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HERO SECTION
═══════════════════════════════════════════════ */
function HeroSection({ onEnter }: { onEnter: () => void }) {
  return (
    <section style={{
      minHeight: "85vh",
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      padding: "120px 24px 80px",
      position: "relative",
      background: "#000",
      overflow: "hidden"
    }}>
      {/* Fine grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: "60vw", height: "60vw",
        maxWidth: "600px", maxHeight: "600px",
        background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)",
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{
        maxWidth: "1000px", margin: "0 auto", width: "100%",
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center"
      }}>

        {/* Date / edition line */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px", width: "100%", maxWidth: "600px" }}
        >
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15))" }} />
          <span style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "10px", letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · EDITION GENESIS
          </span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(270deg, transparent, rgba(255,255,255,0.15))" }} />
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{ marginBottom: "60px" }}
        >
          <h2 style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: "clamp(42px, 8vw, 96px)",
            fontWeight: 400, lineHeight: 1.05,
            color: "#fff", letterSpacing: "-0.01em",
            textShadow: "0 10px 40px rgba(0,0,0,0.6)",
          }}>
            HAVEN Humanity<br />
            <em style={{ fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}>Protocol</em>
          </h2>
        </motion.div>

        {/* Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            onClick={onEnter}
            style={{
              background: "#fff", color: "#000",
              border: "1px solid #fff", cursor: "pointer",
              padding: "16px 48px",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "12px", letterSpacing: "0.25em",
              textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: "16px",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 0 20px rgba(255,255,255,0.1)",
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = "rgba(0,0,0,0.5)";
              (e.target as HTMLElement).style.color = "#fff";
              (e.target as HTMLElement).style.boxShadow = "0 0 40px rgba(255,255,255,0.2)";
              const arrow = (e.target as HTMLElement).querySelector('span');
              if (arrow) arrow.style.transform = "translateX(6px)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = "#fff";
              (e.target as HTMLElement).style.color = "#000";
              (e.target as HTMLElement).style.boxShadow = "0 0 20px rgba(255,255,255,0.1)";
              const arrow = (e.target as HTMLElement).querySelector('span');
              if (arrow) arrow.style.transform = "translateX(0)";
            }}
          >
            Access Dashboard
            <span style={{ fontSize: "16px", fontStyle: "italic", transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)" }}>→</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   METRICS BAND (replaces VaultStats)
═══════════════════════════════════════════════ */
function MetricsBand() {
  return (
    <section style={{
      borderTop: "3px solid #fff",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      background: "#0a0a0a",
    }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 48px" }}>
        <VaultStats />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   STRATEGY BRIEF
═══════════════════════════════════════════════ */
function StrategySection() {
  return (
    <section style={{ padding: "100px 48px", background: "#050505", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "80px" }}>
          <div>
            <SectionRule roman="I" title="Investment Philosophy" subtitle="Mathematical precision in benevolence capital allocation" />

            <div style={{
              padding: "24px",
              border: "1px solid rgba(255,255,255,0.08)",
              marginTop: "32px",
            }}>
              <p style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: "11px", letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                marginBottom: "12px",
              }}>Risk-Adjusted Return</p>
              <p style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: "48px", color: "#fff",
                letterSpacing: "-0.02em", lineHeight: 1,
              }}>12.4<span style={{ fontSize: "28px", color: "rgba(255,255,255,0.4)" }}>%</span></p>
              <p style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: "11px", fontStyle: "italic",
                color: "rgba(255,255,255,0.3)", marginTop: "8px",
              }}>Annualised yield, net of protocol fees</p>
            </div>
          </div>

          <div>
            <PrincipleRow
              n="01"
              title="Quantitative Impact Verification"
              body="All impact proofs are assessed through SATIN Oracle's multi-modal AI verification engine, producing a deterministic impact score expressed as a function of scope, reach, and verifiability. No human discretion in the reward pathway."
            />
            <PrincipleRow
              n="02"
              title="Reputation as Collateral"
              body="On-chain Reputation Capital accumulates through validated actions. The protocol treats staked reputation as economic collateral, enabling tiered access to governance rights, yield multipliers, and capital deployment authority."
            />
            <PrincipleRow
              n="03"
              title="Zero-Knowledge Privacy Layer"
              body="ZKP Shield ensures that impact submissions are verifiable without revealing sensitive operational data. Privacy and auditability are not in tension within this architecture — they are complementary properties."
            />
            <PrincipleRow
              n="04"
              title="Algorithmic Governance"
              body="Protocol parameters are governed by a quadratic voting mechanism weighted by reputation stake. Governance epochs run on a fixed schedule, ensuring orderly deliberation over system evolution without plutocratic capture."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   ALLOCATION
═══════════════════════════════════════════════ */
function AllocationSection() {
  return (
    <section style={{ padding: "100px 48px", background: "#000", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "100px" }}>
          <div>
            <SectionRule roman="II" title="Capital Allocation" subtitle="Protocol treasury composition and deployment strategy" />
            <AllocRow label="Impact Reward Reserve" pct={42} note="Primary yield generation layer" />
            <AllocRow label="Liquidity Provision" pct={28} note="Protocol-owned market depth" />
            <AllocRow label="Governance Reserve" pct={18} note="Quadratic voting collateral pool" />
            <AllocRow label="Development Fund" pct={8} note="Core engineering & audit" />
            <AllocRow label="Emergency Reserve" pct={4} note="Black swan circuit breaker" />
          </div>

          <div>
            <SectionRule roman="III" title="Performance Metrics" subtitle="Key protocol indicators, updated every 8 seconds" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
              <MetricTile label="Total Value Locked" value="$4.21M" note="Across all protocol layers" />
              <MetricTile label="Active Participants" value="2,847" note="Unique verified addresses" />
              <MetricTile label="Impact Events Verified" value="14,392" note="Cumulative since genesis" />
              <MetricTile label="Tokens Distributed" value="891K" note="HAVEN, net of burns" />
              <MetricTile label="Protocol Uptime" value="99.98%" note="Since mainnet launch" />
              <MetricTile label="Oracle Accuracy" value="99.3%" note="SATIN verification score" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   CONNECT GATE
═══════════════════════════════════════════════ */
function ConnectGate() {
  return (
    <section style={{
      minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "80px 48px", background: "#000",
      borderTop: "1px solid rgba(255,255,255,0.08)",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}
      >
        {/* Decorative mark */}
        <div style={{
          width: "1px", height: "60px", background: "rgba(255,255,255,0.15)",
          margin: "0 auto 32px",
        }} />

        <p style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "10px", letterSpacing: "0.3em",
          color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
          marginBottom: "16px",
        }}>Access Required</p>

        <h2 style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontWeight: 400, fontSize: "32px",
          color: "#fff", letterSpacing: "0.01em",
          marginBottom: "16px", lineHeight: 1.3,
        }}>
          Connect Your<br /><em>Institutional Wallet</em>
        </h2>

        <p style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "14px", color: "rgba(255,255,255,0.4)",
          lineHeight: 1.8, marginBottom: "40px",
          fontStyle: "italic",
        }}>
          Authenticate to access the protocol dashboard, submit impact proofs,
          and participate in quantitative governance.
        </p>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "40px" }}>
          <ConnectButton />
        </div>

        {/* Attestations */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "24px",
          display: "flex", justifyContent: "center", gap: "32px",
        }}>
          {["AI-Verified", "ZK-Protected", "On-Chain Settled"].map(f => (
            <div key={f} style={{ textAlign: "center" }}>
              <p style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: "9px", letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
              }}>{f}</p>
            </div>
          ))}
        </div>

        <div style={{ width: "1px", height: "60px", background: "rgba(255,255,255,0.15)", margin: "32px auto 0" }} />
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   DASHBOARD PANEL (connected state)
═══════════════════════════════════════════════ */
function Dashboard({ address, score, nativeBalance, eventCount }: {
  address: string; score: number; nativeBalance: any; eventCount: number;
}) {
  const [tab, setTab] = useState<TabId>("submit");

  return (
    <section style={{ background: "#030303", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 48px" }}>

        {/* Account header */}
        <div className="inst-acct-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "32px 0", gap: "24px",
        }}>
          <div>
            <p style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "9px", letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
              marginBottom: "8px",
            }}>Connected Account</p>
            <p style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "13px", color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.06em",
            }}>{address.slice(0, 12)}…{address.slice(-10)}</p>
          </div>

          <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)", padding: "0 32px" }}>
            <p style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "9px", letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
              marginBottom: "8px",
            }}>Impact Score</p>
            <p style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "28px", color: "#fff",
            }}>
              <AnimatedNumber value={score} />
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "9px", letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
              marginBottom: "8px",
            }}>HAVEN Balance</p>
            <p style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "28px", color: "#fff",
            }}>
              <AnimatedNumber
                value={nativeBalance ? Number(nativeBalance.formatted) : 0}
                isFloat={true}
              />
            </p>
          </div>
        </div>

        {/* Tab navigation — editorial style */}
        <div style={{
          display: "flex", overflowX: "auto",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          scrollbarWidth: "none",
        }}>
          <style>{`.inst-tabs::-webkit-scrollbar { display: none; }`}</style>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "20px 24px",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "5px", flexShrink: 0,
                  borderBottom: active ? "2px solid #fff" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontSize: "8px", letterSpacing: "0.15em",
                  color: active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)",
                  textTransform: "uppercase",
                }}>{t.roman}</span>
                <span style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontSize: "12px", letterSpacing: "0.05em",
                  color: active ? "#fff" : "rgba(255,255,255,0.38)",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s",
                }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: "60px 0 100px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <ErrorBoundary context={tab}>
                {tab === "submit" && <SubmitImpactForm />}
                {tab === "profile" && <div style={{ maxWidth: "520px" }}><ReputationCard address={address} reputationScore={score} /></div>}
                {tab === "stream" && <CommunityStream address={address} reputationScore={score} />}
                {tab === "feed" && <ImpactFeed />}
                {tab === "badges" && <Badges address={address} />}
                {tab === "leaderboard" && <Leaderboard />}
                {tab === "transfer" && <P2PTransfer address={address} />}
                {tab === "governance" && <GovernancePanel reputationScore={score} eventCount={eventCount} />}
                {tab === "economy" && <EconomyDashboard />}
                {tab === "protocol" && <ProtocolStatus />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   ROOT PAGE
═══════════════════════════════════════════════ */
export default function Home() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const dashRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const { data: repData } = useReadContract({
    address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
    abi: REPUTATION_LEDGER_ABI,
    functionName: "getReputation",
    args: address ? [address] : ["0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 8_000 },
  });

  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}`,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });

  const { data: hasIdentity } = useReadContract({
    address: CONTRACTS.SOVEREIGN_ID as `0x${string}`,
    abi: SOVEREIGN_ID_ABI,
    functionName: "hasIdentity",
    args: address ? [address] : ["0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 8_000 },
  });

  if (!mounted) return null;

  const repArr = repData as readonly [bigint, bigint, bigint] | undefined;
  const score = repArr ? Number(repArr[0]) / 100 : 0;
  const eventCount = repArr ? Number(repArr[2]) : 0;

  const scrollToDash = () => {
    dashRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      color: "#fff",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      {/* Global CSS overrides for institutional theme */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #000 !important; }
        ::-webkit-scrollbar { width: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }

        /* Override VaultStats to match monochrome theme */
        .cyber-stat-card { border-color: rgba(255,255,255,0.06) !important; }
        .cyber-label { color: rgba(255,255,255,0.35) !important; font-family: 'Georgia','Times New Roman',serif !important; letter-spacing: 0.15em !important; font-size: 9px !important; }
        .cyber-value { font-family: 'Georgia','Times New Roman',serif !important; background: none !important; -webkit-text-fill-color: rgba(255,255,255,0.9) !important; color: rgba(255,255,255,0.9) !important; font-size: 28px !important; letter-spacing: -0.01em !important; }

        /* Override RainbowKit connect button */
        [data-rk] button {
          background: #fff !important;
          color: #000 !important;
          border-radius: 0 !important;
          font-family: 'Georgia','Times New Roman',serif !important;
          letter-spacing: 0.12em !important;
          font-size: 11px !important;
        }
        [data-rk] { --rk-colors-accentColor: #fff !important; --rk-colors-accentColorForeground: #000 !important; --rk-radii-connectButton: 0px !important; }

        /* Animated underline for section links */
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .masthead-meta { display: none !important; }
          .masthead-sub { display: none !important; }
          .inst-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .inst-strat-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .inst-alloc-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .inst-acct-grid  { grid-template-columns: 1fr !important; gap: 32px !important; text-align: center !important; }
          .inst-acct-grid > div { border-left: none !important; border-right: none !important; padding: 0 !important; }
          .inst-padding    { padding: 60px 24px !important; }
        }
      `}</style>

      <Ticker />
      <Masthead />

      {/* Hero */}
      <HeroSection onEnter={scrollToDash} />

      {/* Live stats band */}
      <MetricsBand />

      {/* Strategy / Allocation commented out for now as requested */}

      {/* Dashboard / Connect gate */}
      <div ref={dashRef}>
        {isConnected && address ? (
          <Dashboard
            address={address}
            score={score}
            nativeBalance={nativeBalance}
            eventCount={eventCount}
          />
        ) : (
          <ConnectGate />
        )}
      </div>

      {/* ═══ Footer ═══ */}
      <footer style={{
        background: "#000",
        borderTop: "3px solid rgba(255,255,255,0.12)",
        padding: "40px 48px",
      }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
            <div>
              <p style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: "15px", letterSpacing: "0.2em",
                color: "rgba(255,255,255,0.7)", textTransform: "uppercase",
                marginBottom: "8px",
              }}>Haven Humanity</p>
              <p style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: "10px", letterSpacing: "0.15em",
                color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
              }}>PoBA Protocol · v2.0.0 · Chain 777000</p>
            </div>

            <div style={{ display: "flex", gap: "48px" }}>
              {["SATIN Oracle", "ZKP Shield", "HAVEN L1 Subnet"].map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "5px", height: "5px", borderRadius: "50%",
                    background: "rgba(255,255,255,0.6)",
                    boxShadow: "0 0 6px rgba(255,255,255,0.4)",
                    animation: "livePulse 2.6s ease-in-out infinite",
                  }} />
                  <p style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: "10px", letterSpacing: "0.15em",
                    color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
                  }}>{s}</p>
                </div>
              ))}
            </div>

            <p style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "10px", letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.2)", textTransform: "uppercase",
              alignSelf: "flex-end",
            }}>© 2026 Haven Humanity Protocol</p>
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginTop: "32px" }} />
        </div>
      </footer>

      <style>{`
        @keyframes livePulse {
          0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.6)}
        }
      `}</style>
    </div>
  );
}