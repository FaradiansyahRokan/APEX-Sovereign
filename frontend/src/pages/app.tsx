"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import WalletAuthModal from "@/components/WalletAuthModal";
import { useHavenWallet } from "@/hooks/useHavenWallet";
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, animate,
} from "framer-motion";

/* ─────────────────────────────────────────────
   THEME
───────────────────────────────────────────── */
type Theme = "dark" | "light";

const C = {
  bg: "var(--hv-bg)",
  bg2: "var(--hv-bg2)",
  nav: "var(--hv-nav)",
  marquee: "var(--hv-marquee)",
  text: "var(--hv-text)",
  t55: "var(--hv-t55)",
  t45: "var(--hv-t45)",
  t38: "var(--hv-t38)",
  t28: "var(--hv-t28)",
  t22: "var(--hv-t22)",
  t18: "var(--hv-t18)",
  t12: "var(--hv-t12)",
  t08: "var(--hv-t08)",
  t04: "var(--hv-t04)",
  t02: "var(--hv-t02)",
  border: "var(--hv-border)",
  border2: "var(--hv-border-2)",
  border3: "var(--hv-border-3)",
  borderStr: "var(--hv-border-str)",
  surf: "var(--hv-surf)",
  surf2: "var(--hv-surf2)",
  surfH: "var(--hv-surf-hover)",
  actBg: "var(--hv-action-bg)",
  actTx: "var(--hv-action-text)",
  actHv: "var(--hv-action-hover)",
} as const;

/* ─────────────────────────────────────────────
   ANIMATED NUMBER
───────────────────────────────────────────── */
function AnimatedNumber({ value, isFloat = false }: { value: number; isFloat?: boolean }) {
  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (v) =>
    isFloat
      ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(v).toLocaleString()
  );
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.8, ease: "easeOut" });
    return c.stop;
  }, [value, mv]);
  return <motion.span>{formatted}</motion.span>;
}

/* ─────────────────────────────────────────────
   TABS
───────────────────────────────────────────── */
type TabId =
  | "submit" | "governance" | "economy" | "protocol"
  | "profile" | "feed" | "badges" | "leaderboard" | "transfer" | "stream";

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

/* ─────────────────────────────────────────────
   THEME ICON
───────────────────────────────────────────── */
function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   MARQUEE
───────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  "HAVEN Protocol v2.0",
  "PoBA Consensus Active",
  "Sovereign Avalanche L1",
  "SATIN Oracle — 8 Layers",
  "ZK-Shield Operational",
  "Chain ID 777000 · Live",
  "Quadratic Benevolence Voting",
  "BenevolenceVault · Verified",
];

function MarqueeStrip() {
  return (
    <div style={{
      height: 44, overflow: "hidden", display: "flex", alignItems: "center",
      background: C.marquee, borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        display: "flex", whiteSpace: "nowrap",
        animation: "marqueeScroll 38s linear infinite", willChange: "transform",
      }}>
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 20, padding: "0 40px",
            fontFamily: "var(--sans)", fontSize: 8.5, letterSpacing: "0.26em",
            textTransform: "uppercase" as const, color: C.t28,
          }}>
            <span style={{ fontSize: 4, color: C.t18 }}>◆</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────────── */
function Navigation({
  theme,
  onToggleTheme,
  havenConnected,
  havenAddress,
  isMetaMaskConnected,
  onOpenWalletModal,
  onDisconnectHaven,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  havenConnected: boolean;
  havenAddress: string | null;
  isMetaMaskConnected: boolean;
  onOpenWalletModal: () => void;
  onDisconnectHaven: () => void;
}) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 200,
      height: 68, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 clamp(20px,5vw,80px)",
      background: C.nav, backdropFilter: "blur(20px) saturate(0.8)",
      WebkitBackdropFilter: "blur(20px) saturate(0.8)",
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <a href="#" style={{
          fontFamily: "var(--serif)", fontSize: 19, fontWeight: 300,
          letterSpacing: "0.42em", textTransform: "uppercase" as const,
          color: C.text, textDecoration: "none",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <span style={{ display: "block", width: 22, height: 1, background: C.t28 }} />
          Haven
        </a>
        <span className="nav-version-badge" style={{
          fontFamily: "var(--sans)", fontSize: 7.5, letterSpacing: "0.22em",
          textTransform: "uppercase" as const, color: C.t22,
          border: `1px solid ${C.border2}`, padding: "3px 9px",
        }}>
          v2.0 · Chain 777000
        </span>
      </div>

      {/* Centre nav links */}
      <div className="nav-links-wrap" style={{ display: "flex", gap: 36 }}>
        {["Protocol", "Oracle", "Economy", "Governance"].map((lbl) => (
          <a key={lbl} href="#" style={{
            fontFamily: "var(--sans)", fontSize: 9.5, letterSpacing: "0.2em",
            textTransform: "uppercase" as const, color: C.t38,
            textDecoration: "none", transition: "color 0.2s",
          }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = C.text)}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = C.t38)}>
            {lbl}
          </a>
        ))}
      </div>

      {/* Right: theme + wallet */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <motion.div
            key={theme}
            initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <ThemeIcon theme={theme} />
          </motion.div>
        </button>

        {/* Haven native wallet badge (when connected without MetaMask) */}
        {havenConnected && havenAddress && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              border: `1px solid ${C.border2}`, padding: "7px 14px",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.text, display: "inline-block", animation: "livePulse 2.4s ease-in-out infinite" }} />
            <span style={{
              fontFamily: "var(--mono)", fontSize: 11, color: C.t55, letterSpacing: "0.04em",
            }}>
              {havenAddress.slice(0, 6)}…{havenAddress.slice(-4)}
            </span>
            <button onClick={onDisconnectHaven} style={{
              background: "none", border: "none", color: C.t22, cursor: "pointer",
              fontSize: 14, lineHeight: 1, padding: "0 0 0 4px",
              display: "flex", alignItems: "center",
            }} title="Disconnect">×</button>
          </motion.div>
        )}

        <ConnectButton />

        {/* "No Wallet?" button — only shown when nothing is connected */}
        {!havenConnected && !isMetaMaskConnected && (
          <button
            className="nav-no-wallet-btn"
            onClick={onOpenWalletModal}
            style={{
              fontFamily: "var(--sans)", fontSize: 8.5, letterSpacing: "0.2em",
              textTransform: "uppercase" as const, color: C.t38,
              background: "none", border: `1px solid ${C.border2}`,
              padding: "8px 16px", cursor: "pointer", transition: "color 0.2s, border-color 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.text; (e.currentTarget as HTMLElement).style.borderColor = C.borderStr; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.t38; (e.currentTarget as HTMLElement).style.borderColor = C.border2; }}
          >
            No Wallet? →
          </button>
        )}
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   HERO CONNECTED — minimal tagline strip
───────────────────────────────────────────── */
function HeroConnected({ address }: { address: string }) {
  const lines = [
    "Your action is your highest asset.",
    "Every token backed by a verified act of human goodness.",
    "The protocol remembers what the world forgets.",
  ];
  // Rotate quote based on address last char so it feels personalised
  const quote = lines[parseInt(address.slice(-1), 16) % lines.length];

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      background: C.bg,
    }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto",
        padding: "48px clamp(20px,5vw,80px)",
        borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 40, flexWrap: "wrap",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p style={{
            fontFamily: "var(--sans)", fontSize: 8.5, letterSpacing: "0.28em",
            textTransform: "uppercase" as const, color: C.t22, marginBottom: 12,
          }}>
            Haven Protocol · Genesis Phase
          </p>
          <p style={{
            fontFamily: "var(--serif)", fontWeight: 300,
            fontSize: "clamp(22px,2.8vw,36px)",
            color: C.text, lineHeight: 1.2, letterSpacing: "-0.01em",
          }}>
            <em style={{ fontStyle: "italic", color: C.t45 }}>{quote}</em>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            border: `1px solid ${C.border2}`, padding: "10px 18px", flexShrink: 0
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: C.text,
            display: "inline-block", animation: "livePulse 2.4s ease-in-out infinite",
          }} />
          <span style={{
            fontFamily: "var(--sans)", fontSize: 8, letterSpacing: "0.22em",
            textTransform: "uppercase" as const, color: C.t28,
          }}>
            Sovereign L1 · Chain 777000 · Active
          </span>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HERO LANDING — full headline + CTA (not connected)
───────────────────────────────────────────── */
function HeroSection({ onEnter, onOpenWalletModal }: { onEnter: () => void; onOpenWalletModal: () => void }) {
  return (
    <div style={{
      maxWidth: 1320, margin: "0 auto",
      padding: "0 clamp(20px,5vw,80px)",
      borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
    }}>
      <section style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start",
        justifyContent: "center", minHeight: "calc(100vh - 112px)",
        padding: "100px 0",
      }}>

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}
        >
          <span style={{ display: "block", width: 36, height: 1, background: C.t22 }} />
          <span style={{
            fontFamily: "var(--sans)", fontSize: 9.5, letterSpacing: "0.3em",
            textTransform: "uppercase" as const, color: C.t28,
          }}>
            StoneBridge Intelligence · Genesis Phase · 2025
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
          style={{
            fontFamily: "var(--serif)", fontWeight: 300,
            fontSize: "clamp(52px,7.5vw,110px)",
            color: C.text, lineHeight: 1.03, letterSpacing: "-0.02em",
            maxWidth: 820, marginBottom: 28,
          }}
        >
          Humanity&nbsp;Action<br />
          <em style={{ fontStyle: "italic", color: C.t38 }}>Verified On-Chain</em>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            fontFamily: "var(--serif)", fontSize: "clamp(15px,1.5vw,18px)",
            fontStyle: "italic", color: C.t45, lineHeight: 1.85,
            maxWidth: 540, marginBottom: 56,
          }}
        >
          A decentralised protocol that converts real-world humanitarian actions into
          on-chain economic value through{" "}
          <span style={{ color: C.text }}>Proof of Beneficial Action</span> —
          a mechanism that has never existed before.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.42 }}
          style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}
          className="hero-cta-flex"
        >
          <button
            onClick={onEnter}
            style={{
              fontFamily: "var(--sans)", fontSize: 9.5, letterSpacing: "0.22em",
              textTransform: "uppercase" as const, color: C.actTx,
              background: C.actBg, border: "none", padding: "17px 44px",
              cursor: "pointer", transition: "background 0.22s, transform 0.18s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.actHv; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.actBg; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
          >
            Access Dashboard
          </button>

          <button
            onClick={onOpenWalletModal}
            style={{
              fontFamily: "var(--sans)", fontSize: 9.5, letterSpacing: "0.22em",
              textTransform: "uppercase" as const, color: C.t45,
              background: "transparent", border: `1px solid ${C.border2}`,
              padding: "16px 36px", cursor: "pointer",
              transition: "color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.text; (e.currentTarget as HTMLElement).style.borderColor = C.borderStr; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.t45; (e.currentTarget as HTMLElement).style.borderColor = C.border2; }}
          >
            Create / Import Wallet →
          </button>

          <a href="#" style={{
            fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic",
            color: C.t38, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 10,
            transition: "color 0.2s",
          }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.text)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.t38)}
          >
            Read Whitepaper <span style={{ fontStyle: "normal" }}>→</span>
          </a>
        </motion.div>

        {/* Live indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            border: `1px solid ${C.border2}`, padding: "10px 18px", marginTop: 56,
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: C.text,
            display: "inline-block", animation: "livePulse 2.4s ease-in-out infinite",
          }} />
          <span style={{
            fontFamily: "var(--sans)", fontSize: 8.5, letterSpacing: "0.24em",
            textTransform: "uppercase" as const, color: C.t28,
          }} className="hero-live-text">
            Sovereign Avalanche L1 · Chain ID 777000 · Active
          </span>
        </motion.div>

      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────
   VAULT STATS BAND
───────────────────────────────────────────── */
function MetricsBand() {
  return (
    <section style={{
      borderTop: `1px solid ${C.border3}`, borderBottom: `1px solid ${C.border}`,
      background: C.surf,
    }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px,5vw,80px)" }}>
        <VaultStats />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CONNECT GATE
───────────────────────────────────────────── */
function ConnectGate({ onOpenWalletModal }: { onOpenWalletModal: () => void }) {
  return (
    <section style={{
      minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "80px clamp(20px,5vw,80px)",
      background: C.bg, borderTop: `1px solid ${C.border}`,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ maxWidth: 480, width: "100%", textAlign: "center" as const }}
      >
        <div style={{ width: 1, height: 64, background: C.border3, margin: "0 auto 36px" }} />

        <p style={{
          fontFamily: "var(--sans)", fontSize: 9.5, letterSpacing: "0.3em",
          textTransform: "uppercase" as const, color: C.t28, marginBottom: 16,
        }}>Access Required</p>

        <h2 style={{
          fontFamily: "var(--serif)", fontWeight: 300,
          fontSize: "clamp(28px,3.5vw,46px)", color: C.text, lineHeight: 1.2, marginBottom: 20,
        }}>
          Connect Your<br /><em style={{ fontStyle: "italic", color: C.t45 }}>Verified Wallet</em>
        </h2>

        <p style={{
          fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic",
          color: C.t38, lineHeight: 1.85, marginBottom: 44,
        }}>
          Authenticate to access the protocol dashboard, submit impact proofs,
          and participate in Quadratic Benevolence Voting.
        </p>

        {/* Two connect options side by side */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 44 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ConnectButton />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{
              fontFamily: "var(--sans)", fontSize: 8, letterSpacing: "0.2em",
              textTransform: "uppercase" as const, color: C.t22,
            }}>or</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <button
            onClick={onOpenWalletModal}
            style={{
              fontFamily: "var(--sans)", fontSize: 9.5, letterSpacing: "0.2em",
              textTransform: "uppercase" as const, color: C.t55,
              background: C.surf, border: `1px solid ${C.border2}`,
              padding: "14px 28px", cursor: "pointer", transition: "all 0.2s",
              width: "100%",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.surfH; (e.currentTarget as HTMLElement).style.borderColor = C.borderStr; (e.currentTarget as HTMLElement).style.color = C.text; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surf; (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.t55; }}
          >
            Access Without MetaMask →
          </button>
        </div>

        <div className="connect-gate-features" style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 28,
          display: "flex", justifyContent: "center", gap: 40,
        }}>
          {["AI-Verified", "ZK-Protected", "On-Chain Settled"].map((f) => (
            <p key={f} style={{
              fontFamily: "var(--sans)", fontSize: 8.5, letterSpacing: "0.2em",
              textTransform: "uppercase" as const, color: C.t18,
            }}>{f}</p>
          ))}
        </div>

        <div style={{ width: 1, height: 64, background: C.border3, margin: "36px auto 0" }} />
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────── */
function Dashboard({
  address, score, nativeBalance, eventCount,
}: {
  address: string; score: number; nativeBalance: any; eventCount: number;
}) {
  const [tab, setTab] = useState<TabId>("submit");

  return (
    <section style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px,5vw,80px)" }}>

        {/* Account strip */}
        <div className="acct-strip" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          borderBottom: `1px solid ${C.border}`, padding: "36px 0",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 8.5, letterSpacing: "0.24em",
              textTransform: "uppercase" as const, color: C.t22, marginBottom: 10,
            }}>Connected Account</p>
            <p style={{ fontFamily: "var(--mono)", fontSize: 13, color: C.t55, letterSpacing: "0.04em" }}>
              {address.slice(0, 12)}…{address.slice(-10)}
            </p>
          </div>
          <div className="acct-center" style={{
            textAlign: "center" as const,
            borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
            padding: "0 32px",
          }}>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 8.5, letterSpacing: "0.24em",
              textTransform: "uppercase" as const, color: C.t22, marginBottom: 10,
            }}>Impact Score</p>
            <p style={{ fontFamily: "var(--serif)", fontWeight: 300, fontSize: 34, color: C.text, lineHeight: 1 }}>
              <AnimatedNumber value={score} />
            </p>
          </div>
          <div className="acct-right" style={{ textAlign: "right" as const }}>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 8.5, letterSpacing: "0.24em",
              textTransform: "uppercase" as const, color: C.t22, marginBottom: 10,
            }}>STC Balance</p>
            <p style={{ fontFamily: "var(--serif)", fontWeight: 300, fontSize: 34, color: C.text, lineHeight: 1 }}>
              <AnimatedNumber value={nativeBalance ? Number(nativeBalance.formatted) : 0} isFloat />
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="haven-tabs" style={{
          display: "flex", overflowX: "auto",
          borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" as const,
        }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: "22px 26px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 5, flexShrink: 0,
                borderBottom: active ? `2px solid ${C.text}` : "2px solid transparent",
                transition: "border-color 0.18s",
              }}>
                <span style={{
                  fontFamily: "var(--sans)", fontSize: 7.5, letterSpacing: "0.18em",
                  textTransform: "uppercase" as const,
                  color: active ? C.t38 : C.t18,
                }}>{t.roman}</span>
                <span style={{
                  fontFamily: "var(--serif)", fontSize: 13,
                  color: active ? C.text : C.t28, whiteSpace: "nowrap", transition: "color 0.18s",
                }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ padding: "64px 0 100px" }}>
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
              <ErrorBoundary context={tab}>
                {tab === "submit" && <SubmitImpactForm />}
                {tab === "profile" && <div style={{ maxWidth: 520 }}><ReputationCard address={address} reputationScore={score} /></div>}
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

/* ─────────────────────────────────────────────
   ROOT PAGE
───────────────────────────────────────────── */
export default function Home() {
  const { address, isConnected } = useAccount();
  const {
    havenAddress, havenConnected, setHavenWallet, disconnectHaven,
  } = useHavenWallet();

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const dashRef = useRef<HTMLDivElement>(null);

  /* ── Mount + localStorage theme restore ── */
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("haven-theme") as Theme | null;
      const initial: Theme = (saved === "light" || saved === "dark") ? saved : "dark";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    } catch {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  /* ── Mutual exclusion: MetaMask connects → kick Haven wallet ── */
  useEffect(() => {
    if (isConnected && havenConnected) {
      disconnectHaven();
    }
  }, [isConnected, havenConnected, disconnectHaven]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("haven-theme", next); } catch { }
      return next;
    });
  }, []);

  /* ── Contracts (only when MetaMask connected) ── */
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

  const scrollToDash = () => dashRef.current?.scrollIntoView({ behavior: "smooth" });

  /* ── Guard: don't open wallet modal if MetaMask already connected ── */
  const openWalletModal = useCallback(() => {
    if (isConnected) return;   // MetaMask already active — ignore
    setWalletModalOpen(true);
  }, [isConnected]);

  const repArr = repData as readonly [bigint, bigint, bigint] | undefined;
  const score = repArr ? Number(repArr[0]) / 100 : 0;
  const eventCount = repArr ? Number(repArr[2]) : 0;

  const activeAddress = address || havenAddress || undefined;
  const activeConnected = isConnected || havenConnected;

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--serif)" }}>

      {/* ── Global styles ── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); }

        @keyframes marqueeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.6)} }

        .theme-toggle {
          background: none; border: 1px solid var(--hv-border-2);
          color: var(--hv-t38); cursor: pointer;
          padding: 8px 10px; display: flex; align-items: center; justify-content: center;
          transition: color 0.2s, border-color 0.2s;
        }
        .theme-toggle:hover { color: var(--hv-text); border-color: var(--hv-border-str); }

        .haven-tabs::-webkit-scrollbar { display: none; }

        /* Override RainbowKit to match theme */
        [data-rk] button {
          font-family: var(--sans) !important;
          letter-spacing: 0.12em !important;
          font-size: 10px !important;
          border-radius: 0 !important;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .nav-links-wrap { display: none !important; }
        }
        @media (max-width: 600px) {
          .nav-version-badge   { display: none !important; }
          .nav-no-wallet-btn   { display: none !important; }
        }
        @media (max-width: 768px) {
          .acct-strip { grid-template-columns: 1fr !important; gap: 24px !important; }
          .acct-center { border-left: none !important; border-right: none !important; padding: 0 !important; text-align: left !important; }
          .acct-right  { text-align: left !important; }

          /* Hero CTA flex wrap */
          .hero-cta-flex { flex-wrap: wrap !important; gap: 12px !important; }
          .hero-cta-flex button, .hero-cta-flex a {
            width: 100% !important; text-align: center !important; justify-content: center !important;
          }

          /* Live badge text compact */
          .hero-live-text { letter-spacing: 0.12em !important; font-size: 7.5px !important; }

          /* Tab bar smaller padding on mobile */
          .haven-tabs button { padding: 16px 14px !important; }

          /* ConnectGate features row */
          .connect-gate-features { gap: 20px !important; flex-wrap: wrap !important; }

          /* Footer status dots */
          .footer-status-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
        @media (max-width: 480px) {
          /* Nav: give the right side a bit more breathing room */
          nav { padding: 0 16px !important; }
          /* Reduce tab font slightly */
          .haven-tabs button span:last-child { font-size: 11px !important; }
        }
      `}</style>

      <MarqueeStrip />

      <Navigation
        theme={theme}
        onToggleTheme={toggleTheme}
        havenConnected={havenConnected}
        havenAddress={havenAddress}
        isMetaMaskConnected={isConnected}
        onOpenWalletModal={openWalletModal}
        onDisconnectHaven={disconnectHaven}
      />

      <AnimatePresence mode="wait">
        {activeConnected && activeAddress ? (
          <motion.div key="hero-connected"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}>
            <HeroConnected address={activeAddress} />
          </motion.div>
        ) : (
          <motion.div key="hero-landing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}>
            <HeroSection
              onEnter={scrollToDash}
              onOpenWalletModal={openWalletModal}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <MetricsBand />

      {/* Dashboard / Connect gate */}
      <div ref={dashRef}>
        {activeConnected && activeAddress ? (
          <Dashboard
            address={activeAddress}
            score={score}
            nativeBalance={nativeBalance}
            eventCount={eventCount}
          />
        ) : (
          <ConnectGate onOpenWalletModal={openWalletModal} />
        )}
      </div>

      {/* Footer */}
      <footer style={{
        background: C.bg, borderTop: `1px solid ${C.border3}`,
        padding: "56px clamp(20px,5vw,80px) 44px",
      }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div className="footer-grid" style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            gap: 48, marginBottom: 44, paddingBottom: 44, borderBottom: `1px solid ${C.border}`,
            flexWrap: "wrap",
          }}>
            <div>
              <p style={{
                fontFamily: "var(--serif)", fontWeight: 300, fontSize: 20,
                letterSpacing: "0.38em", textTransform: "uppercase" as const,
                color: C.text, marginBottom: 6,
              }}>Haven</p>
              <p style={{
                fontFamily: "var(--sans)", fontSize: 8, letterSpacing: "0.2em",
                textTransform: "uppercase" as const, color: C.t22, marginBottom: 16,
              }}>Humanity Action Verification &amp; Economic Network</p>
              <p style={{
                fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic",
                color: C.t28, maxWidth: 240, lineHeight: 1.7,
              }}>Every token backed by a verified act of human goodness.</p>
            </div>
            <div className="footer-status-row" style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              {["SATIN Oracle", "ZK-Shield", "HAVEN L1 Subnet"].map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%", background: C.t45,
                    display: "inline-block", animation: "livePulse 2.6s ease-in-out infinite",
                  }} />
                  <p style={{
                    fontFamily: "var(--sans)", fontSize: 9, letterSpacing: "0.18em",
                    textTransform: "uppercase" as const, color: C.t28,
                  }}>{s}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 16,
          }}>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 8, letterSpacing: "0.16em",
              textTransform: "uppercase" as const, color: C.t18,
            }}>
              © 2025 StoneBridge Intelligence · Confidential · Not financial advice
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {["HAVEN v2.0", "Chain 777000", "Solidity 0.8.20"].map((b) => (
                <span key={b} style={{
                  fontFamily: "var(--sans)", fontSize: 7.5, letterSpacing: "0.16em",
                  textTransform: "uppercase" as const, color: C.t18,
                  border: `1px solid ${C.border}`, padding: "4px 10px",
                }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── Wallet Auth Modal ── */}
      <WalletAuthModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onConnected={(addr, provider, signer) => {
          setHavenWallet(addr, provider, signer);
          setWalletModalOpen(false);
        }}
      />

    </div>
  );
}