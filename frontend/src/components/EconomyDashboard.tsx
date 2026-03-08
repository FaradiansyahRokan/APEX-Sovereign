"use client";

import { useState, useEffect, useCallback } from "react";
import { useReadContracts, useBalance, useAccount, usePublicClient } from "wagmi";
import { formatEther, parseAbiItem } from "viem";
import { BENEVOLENCE_VAULT_ABI } from "../utils/abis";
import { CONTRACTS } from "../utils/constants";
import { ENV } from "../utils/env";

const ORACLE_API = ENV.ORACLE_URL;
const API_KEY = ENV.HAVEN_ORACLE_KEY || "HAVEN_ROKAN_NJXBDSA_010011";
const DEAD_ADDR = "0x000000000000000000000000000000000000dEaD" as const;

function hFetch(path: string) {
  return fetch(`${ORACLE_API}${path}`, { headers: { "X-HAVEN-Oracle-Key": API_KEY } });
}

const CRISIS_FUND_ABI = [{
  name: "getStats", type: "function", stateMutability: "view", inputs: [],
  outputs: [
    { name: "donated", type: "uint256" }, { name: "distributed", type: "uint256" },
    { name: "reflexPaid", type: "uint256" }, { name: "treasuryBalance", type: "uint256" },
  ],
}] as const;

const REPUTATION_LEDGER_ABI = [{
  name: "getGlobalStats", type: "function", stateMutability: "view", inputs: [],
  outputs: [{ name: "participants", type: "uint256" }, { name: "totalScore", type: "uint256" }],
}, {
  name: "getLeaderboardPage", type: "function", stateMutability: "view",
  inputs: [{ name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }],
  outputs: [{ name: "addresses", type: "address[]" }, { name: "scores", type: "uint256[]" }, { name: "ranks", type: "uint256[]" }],
}] as const;

const REWARD_RELEASED_EVENT = parseAbiItem(
  "event RewardReleased(bytes32 indexed eventId, address indexed volunteer, address indexed beneficiary, uint256 impactScore, uint256 tokenReward, bytes32 zkProofHash, bytes32 eventHash, uint256 timestamp)"
);

interface EconomyData {
  protocol_phase: string;
  mint_cap: {
    annual_mint_cap: number; phase: string;
    suffering_index?: { composite: number; famine_score: number; displacement_score: number; disaster_score: number };
    deflation_pressure: number;
  };
  economy_health: string;
  velocity?: { velocity_bonus: number; idle_decay_annual: number; reflex_bonus: number; flywheel_health: string };
}

interface FlywheelData { total_minted: number; total_burned: number; burn_rate_30d: number; velocity: any; }
interface HolderEntry { address: string; balance: number; total_earned: number; share_pct: number; }
interface DistData { distributed_supply: number; holder_count: number; top_holders: HolderEntry[]; top25_concentration: number; }

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

// ─── Hook: native supply ───────────────────────────────────────────────
function useNativeSupplyStats() {
  const client = usePublicClient();
  const { data: contractData } = useReadContracts({
    contracts: [
      { address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`, abi: BENEVOLENCE_VAULT_ABI, functionName: "getStats" },
      { address: CONTRACTS.CRISIS_FUND as `0x${string}`, abi: CRISIS_FUND_ABI, functionName: "getStats" },
      { address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`, abi: REPUTATION_LEDGER_ABI, functionName: "getGlobalStats" },
    ],
    query: { refetchInterval: 30_000 },
  });
  const [deadBurned, setDeadBurned] = useState(0);
  useEffect(() => {
    if (!client) return;
    client.getBalance({ address: DEAD_ADDR }).then(b => setDeadBurned(Number(formatEther(b)))).catch(() => { });
  }, [client]);

  const vault  = contractData?.[0]?.result as any;
  const crisis = contractData?.[1]?.result as any;
  const global = contractData?.[2]?.result as any;

  const totalMinted    = vault  ? Number(formatEther(vault[1])) : null;
  const crisisLocked   = crisis ? Number(formatEther(crisis[3])) : 0;
  const totalDonated   = crisis ? Number(formatEther(crisis[0])) : 0;
  const eventsVerified = vault  ? Number(vault[2]) : 0;
  const totalParticipants = global ? Number(global[0]) : 0;
  const totalImpactScore  = global ? Number(global[1]) : 0;
  const liveSupply = totalMinted !== null ? Math.max(0, totalMinted - deadBurned - crisisLocked) : null;

  return { totalMinted, deadBurned, crisisLocked, totalDonated, liveSupply, eventsVerified, totalParticipants, totalImpactScore, isLoading: !contractData, isOnChain: !!contractData };
}

// ─── Hook: volunteer holders ─────────────────────────────────────────
function useVolunteerHolders(connectedAddr?: string) {
  const client = usePublicClient();
  const [dist, setDist] = useState<DistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    (async () => {
      setLoading(true);
      try {
        const logs = await client.getLogs({
          address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`,
          event: REWARD_RELEASED_EVENT, fromBlock: "earliest", toBlock: "latest",
        });
        const earnMap: Record<string, number> = {};
        logs.forEach((l: any) => {
          const vol = (l.args.volunteer as string).toLowerCase();
          earnMap[vol] = (earnMap[vol] || 0) + Number(formatEther(l.args.tokenReward as bigint));
        });
        const addrs = Object.keys(earnMap);
        const balances = await Promise.all(
          addrs.map(a => client.getBalance({ address: a as `0x${string}` }).then(b => Number(formatEther(b))).catch(() => 0))
        );
        const totalBal = balances.reduce((s, b) => s + b, 0);
        const holders: HolderEntry[] = addrs.map((a, i) => ({
          address: a, balance: balances[i],
          total_earned: earnMap[a],
          share_pct: totalBal > 0 ? (balances[i] / totalBal) * 100 : 0,
        })).sort((a, b) => b.balance - a.balance);
        const top25 = holders.slice(0, 25);
        const top25Bal = top25.reduce((s, h) => s + h.balance, 0);
        setDist({
          distributed_supply: totalBal, holder_count: holders.length,
          top_holders: holders,
          top25_concentration: totalBal > 0 ? (top25Bal / totalBal) * 100 : 0,
        });
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [client]);
  return { dist, loading, error };
}

// ─── Shared sub-components ────────────────────────────────────────────
function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.08)",
      padding: "22px 0",
    }}>
      <p style={{
        fontFamily: S, fontStyle: "italic", fontSize: "10px",
        color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em",
        textTransform: "uppercase", marginBottom: "8px",
      }}>{label}</p>
      <p style={{
        fontFamily: M, fontSize: "22px",
        color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em", lineHeight: 1,
      }}>{value}</p>
      {sub && (
        <p style={{
          fontFamily: S, fontStyle: "italic", fontSize: "10px",
          color: "rgba(255,255,255,0.28)", marginTop: "5px",
        }}>{sub}</p>
      )}
    </div>
  );
}

function RuledBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: "14px" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{label}</span>
          <span style={{ fontFamily: M, fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{pct.toFixed(1)}%</span>
        </div>
      )}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`, background: "#fff",
          transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

function shortAddr(a: string) { return `${a.slice(0, 8)}…${a.slice(-6)}`; }

export default function EconomyDashboard() {
  const [economy, setEconomy] = useState<EconomyData | null>(null);
  const [flywheel, setFlywheel] = useState<FlywheelData | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const { address } = useAccount();

  const { totalMinted, deadBurned, crisisLocked, totalDonated, liveSupply, eventsVerified, totalParticipants, isLoading: supplyLoading, isOnChain } = useNativeSupplyStats();
  const { data: userData } = useBalance({ address, query: { refetchInterval: 8_000 } });
  const userBalance = userData ? Number(userData.formatted) : 0;
  const { dist, loading: holderLoading, error: holderError } = useVolunteerHolders(address);

  const effMinted = totalMinted ?? flywheel?.total_minted ?? 0;
  const globalEcosystemBalance = dist?.distributed_supply || 0;
  const effLive = globalEcosystemBalance;
  const effBurned = deadBurned > 0 ? deadBurned : (flywheel?.total_burned ?? 0);
  const deflPct = effMinted > 0 ? (effBurned / effMinted) * 100 : 0;
  const userShare = Math.min(100, effLive > 0 ? (userBalance / effLive) * 100 : (userBalance > 0 ? 100 : 0));
  const daysSince = Math.max(1, (Date.now() - new Date("2026-02-20").getTime()) / 86_400_000);
  const burnRate = (flywheel?.burn_rate_30d || 0) > 0 ? flywheel!.burn_rate_30d : (effBurned / daysSince);

  useEffect(() => {
    Promise.all([
      hFetch("/api/v1/economy/status").then(r => r.json()),
      hFetch("/api/v1/economy/flywheel").then(r => r.json()),
    ]).then(([eco, fly]) => { setEconomy(eco); setFlywheel(fly); })
      .catch(() => { }).finally(() => setApiLoading(false));
  }, []);

  if (apiLoading && supplyLoading) return (
    <div style={{ padding: "80px 0", textAlign: "center" }}>
      <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "14px", color: "rgba(255,255,255,0.25)" }}>
        Retrieving economy data…
      </p>
    </div>
  );

  const mintCap = economy?.mint_cap;
  const maxAnnualCap = mintCap?.annual_mint_cap ?? 191_200_000;
  const suffering = mintCap?.suffering_index;

  let phase = "Early Accumulation";
  if (deflPct > 100) phase = "Hyper Deflationary";
  else if (deflPct > 50) phase = "Deflationary Crunch";
  else if (effLive > maxAnnualCap * 0.9) phase = "Supply Squeeze";
  else if (effLive > maxAnnualCap * 0.5) phase = "Healthy Expansion";

  return (
    <div style={{ maxWidth: "820px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Monetary Architecture</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          {isOnChain && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: "rgba(255,255,255,0.6)",
                animation: "ecoLive 2.6s ease-in-out infinite",
              }} />
              <span style={{ fontFamily: M, fontSize: "8px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>
                ON-CHAIN
              </span>
            </div>
          )}
        </div>
        <h2 style={{ fontFamily: S, fontWeight: 400, fontSize: "30px", color: "#fff", marginBottom: "6px" }}>
          Economy Flywheel
        </h2>
        <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
          Phase: {phase} · {economy?.economy_health?.replace(/_/g, " ")}
        </p>
      </div>

      {/* Supply progress */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontFamily: S, fontStyle: "italic", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
            Ecosystem Supply vs Annual Cap
          </span>
          <span style={{ fontFamily: M, fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>
            {((effLive / maxAnnualCap) * 100).toFixed(2)}%
          </span>
        </div>
        <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", position: "relative", marginBottom: "8px" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${Math.min((effLive / maxAnnualCap) * 100, 100)}%`,
            background: "#fff", transition: "width 1.2s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: M, fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
            {effLive.toLocaleString("en-US", { maximumFractionDigits: 2 })} HAVEN
          </span>
          <span style={{ fontFamily: M, fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
            Cap: {(maxAnnualCap / 1e6).toFixed(1)}M
          </span>
        </div>
        {userBalance > 0 && (
          <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "6px" }}>
            Your holdings represent {userShare.toFixed(4)}% of total ecosystem supply
          </p>
        )}
      </div>

      {/* Main metrics grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: "0 40px",
        borderTop: "2px solid #fff",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "40px",
        paddingBottom: "8px",
      }}>
        <MetricTile
          label="Ecosystem Balance"
          value={`${globalEcosystemBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          sub="Total active wallet holdings"
        />
        <MetricTile
          label="Lifetime Minted"
          value={`${effMinted.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          sub="Via protocol vault"
        />
        <MetricTile
          label="Permanently Burned"
          value={`${effBurned.toLocaleString("en-US", { maximumFractionDigits: 4 })}`}
          sub={`${deflPct.toFixed(2)}% deflation rate`}
        />
        <MetricTile
          label="Events Verified"
          value={eventsVerified.toLocaleString()}
          sub="Cumulative on-chain"
        />
        <MetricTile
          label="Burn Rate"
          value={`${burnRate.toFixed(4)}/day`}
          sub={flywheel?.velocity?.flywheel_health?.replace(/_/g, " ")}
        />
        <MetricTile
          label="Active Participants"
          value={(totalParticipants || 0).toLocaleString()}
          sub="Registered on ledger"
        />
      </div>

      {/* Holder distribution */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <span style={{
            fontFamily: S, fontStyle: "italic", fontSize: "10px",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase",
          }}>Capital Distribution</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        {holderLoading ? (
          <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
            Scanning on-chain reward events…
          </p>
        ) : dist && (
          <>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              marginBottom: "20px",
            }}>
              {[
                { l: "Distinct Holders", v: dist.holder_count.toLocaleString() },
                { l: "Top-25 Concentration", v: `${dist.top25_concentration.toFixed(1)}%` },
              ].map(m => (
                <div key={m.l} style={{
                  padding: "16px 20px",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "rgba(255,255,255,0.3)", marginBottom: "6px" }}>{m.l}</p>
                  <p style={{ fontFamily: M, fontSize: "20px", color: "rgba(255,255,255,0.85)" }}>{m.v}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{
              border: "1px solid rgba(255,255,255,0.07)",
              borderTop: "2px solid rgba(255,255,255,0.2)",
            }}>
              <div style={{
                display: "grid", gridTemplateColumns: "40px 1fr 110px 110px 80px",
                padding: "10px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}>
                {["No.", "Participant", "Balance", "Earned", "Share"].map((h, i) => (
                  <p key={h} style={{
                    fontFamily: S, fontStyle: "italic", fontSize: "9px",
                    color: "rgba(255,255,255,0.28)",
                    textAlign: i >= 2 ? "right" : "left",
                  }}>{h}</p>
                ))}
              </div>
              {dist.top_holders.slice(0, 20).map((h, i) => {
                const isMe = address && h.address.toLowerCase() === address.toLowerCase();
                return (
                  <div key={h.address} style={{
                    display: "grid", gridTemplateColumns: "40px 1fr 110px 110px 80px",
                    padding: "11px 20px", alignItems: "center",
                    borderBottom: i < 19 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    background: isMe ? "rgba(255,255,255,0.02)" : "transparent",
                  }}>
                    <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{i + 1}</p>
                    <p style={{ fontFamily: M, fontSize: "11px", color: isMe ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)" }}>
                      {shortAddr(h.address)}{isMe && <span style={{ fontFamily: S, fontStyle: "italic", fontSize: "9px", color: "rgba(255,255,255,0.5)", marginLeft: "8px" }}>you</span>}
                    </p>
                    <p style={{ fontFamily: M, fontSize: "11px", color: "rgba(255,255,255,0.75)", textAlign: "right" }}>
                      {h.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                    <p style={{ fontFamily: M, fontSize: "11px", color: "rgba(255,255,255,0.45)", textAlign: "right" }}>
                      {h.total_earned.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                    <p style={{ fontFamily: M, fontSize: "10px", color: "rgba(255,255,255,0.35)", textAlign: "right" }}>
                      {h.share_pct.toFixed(3)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Suffering index */}
      {suffering && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <span style={{
              fontFamily: S, fontStyle: "italic", fontSize: "10px",
              color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase",
            }}>Global Suffering Index</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontFamily: M, fontSize: "16px", color: "rgba(255,255,255,0.8)" }}>
              {(suffering.composite * 100).toFixed(1)}%
            </span>
          </div>
          <RuledBar label="Famine Severity"  value={suffering.famine_score}       max={1} />
          <RuledBar label="Displacement"     value={suffering.displacement_score} max={1} />
          <RuledBar label="Disaster Score"   value={suffering.disaster_score}     max={1} />
          <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "8px" }}>
            Live data — GDACS · OCHA · UNHCR · Higher index produces higher token rewards
          </p>
        </div>
      )}

      {/* Velocity model */}
      {economy?.velocity && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "28px",
        }}>
          <p style={{
            fontFamily: S, fontStyle: "italic", fontSize: "10px",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em",
            textTransform: "uppercase", marginBottom: "20px",
          }}>Triple Velocity Model</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0 32px" }}>
            {[
              { label: "Velocity Bonus",   value: economy.velocity.velocity_bonus.toFixed(3) },
              { label: "Idle Decay / yr",  value: `${(economy.velocity.idle_decay_annual * 100).toFixed(1)}%` },
              { label: "Reflex Bonus",     value: `${(economy.velocity.reflex_bonus * 100).toFixed(1)}%` },
            ].map(item => (
              <div key={item.label} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
                <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>
                  {item.label}
                </p>
                <p style={{ fontFamily: M, fontSize: "20px", color: "rgba(255,255,255,0.8)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes ecoLive { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.6)} }
      `}</style>
    </div>
  );
}