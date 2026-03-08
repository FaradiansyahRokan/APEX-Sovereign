"use client";

/**
 * EconomyDashboard.tsx  v3.0.0
 * 
 * HAVEN is a native coin on Avalanche subnet (Fuji testnet),
 * minted via the NativeMinter precompile (0x02000001).
 * There is NO ERC-20 totalSupply(). All supply data comes from:
 *
 *   Total Minted   BenevolenceVault.totalFundsDistributed
 *   Crisis Locked  CrisisFund.getStats()  treasuryBalance
 *   Burned         eth_getBalance(0x000dEaD)  (native dead addr)
 *   Live Supply    totalMinted  burned(dead)
 *   Holder List    scan RewardReleased events  eth_getBalance each volunteer
 * 
 */

import { useState, useEffect, useCallback } from "react";
import { useReadContracts, useBalance, useAccount, usePublicClient } from "wagmi";
import { formatEther, parseAbiItem } from "viem";
import { BENEVOLENCE_VAULT_ABI } from "../utils/abis";
import { CONTRACTS } from "../utils/constants";
import { ENV } from "../utils/env";

//  Config 
const ORACLE_API = ENV.ORACLE_URL;
const API_KEY = ENV.HAVEN_ORACLE_KEY || "haven-dev-key-change-in-prod";
const DEAD_ADDR = "0x000000000000000000000000000000000000dEaD" as const;

function hFetch(path: string) {
    return fetch(`${ORACLE_API}${path}`, {
        headers: { "X-HAVEN-Oracle-Key": API_KEY },
    });
}

//  Minimal CrisisFund ABI 
const CRISIS_FUND_ABI = [
    {
        name: "getStats", type: "function", stateMutability: "view",
        inputs: [],
        outputs: [
            { name: "donated", type: "uint256" },
            { name: "distributed", type: "uint256" },
            { name: "reflexPaid", type: "uint256" },
            { name: "treasuryBalance", type: "uint256" },
        ],
    },
] as const;

// ReputationLedger Minimal ABI
const REPUTATION_LEDGER_ABI = [
    {
        name: "getGlobalStats", type: "function", stateMutability: "view",
        inputs: [],
        outputs: [
            { name: "participants", type: "uint256" },
            { name: "totalScore", type: "uint256" },
        ],
    },
    {
        name: "getLeaderboardPage", type: "function", stateMutability: "view",
        inputs: [{ name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }],
        outputs: [
            { name: "addresses", type: "address[]" },
            { name: "scores", type: "uint256[]" },
            { name: "ranks", type: "uint256[]" },
        ],
    },
] as const;

// RewardReleased event
const REWARD_RELEASED_EVENT = parseAbiItem(
    "event RewardReleased(bytes32 indexed eventId, address indexed volunteer, address indexed beneficiary, uint256 impactScore, uint256 tokenReward, bytes32 zkProofHash, bytes32 eventHash, uint256 timestamp)"
);

//  Types 
interface EconomyData {
    protocol_phase: string;
    mint_cap: {
        annual_mint_cap: number;
        current_mint_rate: number;
        deflation_pressure: number;
        suffering_index: {
            composite: number;
            famine_score: number;
            displacement_score: number;
            disaster_score: number;
        };
        phase: string;
    };
    velocity: { velocity_bonus: number; idle_decay_annual: number; reflex_bonus: number; };
    economy_health: string;
}

interface FlywheelData {
    total_minted: number; total_burned: number;
    circulating_supply: number; deflation_pct: number; burn_rate_30d: number;
    velocity: { flywheel_health: string; donation_velocity: number; };
}

interface HolderEntry {
    address: string;
    balance: number;       // current native balance
    share_pct: number;     // % of totalMinted
    total_earned: number;  // cumulative rewards ever minted to this wallet
}

interface HolderDist {
    total_unique_volunteers: number;
    total_events_verified: number;
    top_holders: HolderEntry[];
    distributed_supply: number;
    fetched_at: number;
}

//  HEALTH COLORS 
const HEALTH_COLORS: Record<string, string> = {
    crisis_response_mode: "#ff9f43",
    high_velocity: "var(--mi)",
    strong_deflation: "#6bff9e",
    deflationary_surge: "#6bff9e",
    governance_engaged: "var(--vi)",
    early_stage: "var(--t2)",
    balanced: "var(--mi)",
    stable_prosperity: "#6bff9e",
};

// 
// HOOK: useNativeSupplyStats
// Reads BenevolenceVault.getStats() + CrisisFund.getStats() + 0xdead balance
// 
function useNativeSupplyStats() {
    const { data, isLoading } = useReadContracts({
        contracts: [
            {
                address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`,
                abi: BENEVOLENCE_VAULT_ABI,
                functionName: "getStats",
            },
            {
                address: CONTRACTS.CRISIS_FUND as `0x${string}`,
                abi: CRISIS_FUND_ABI,
                functionName: "getStats",
            },
            {
                address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
                abi: REPUTATION_LEDGER_ABI,
                functionName: "getGlobalStats",
            },
        ],
        query: { refetchInterval: 8_000 },
    });

    const { data: deadBal } = useBalance({ address: DEAD_ADDR, query: { refetchInterval: 8_000 } });

    const vaultTuple = data?.[0]?.result as readonly [bigint, bigint, bigint, bigint] | undefined;
    const crisisTuple = data?.[1]?.result as readonly [bigint, bigint, bigint, bigint] | undefined;
    const ledgerTuple = data?.[2]?.result as readonly [bigint, bigint] | undefined;

    const totalMinted = vaultTuple ? Number(formatEther(vaultTuple[1])) : 0;
    const eventsVerified = vaultTuple ? Number(vaultTuple[2]) : 0;

    const totalParticipants = ledgerTuple ? Number(ledgerTuple[0]) : 0;
    const totalImpactScore = ledgerTuple ? Number(ledgerTuple[1]) : 0;

    const deadBurned = deadBal ? Number(deadBal.formatted) : 0;
    const totalDonated = crisisTuple ? Number(formatEther(crisisTuple[0])) : 0;
    const crisisLocked = crisisTuple ? Number(formatEther(crisisTuple[3])) : 0;

    const liveSupply = Math.max(0, totalMinted - deadBurned);

    return {
        totalMinted, deadBurned, crisisLocked,
        totalDonated, liveSupply, eventsVerified,
        totalParticipants, totalImpactScore,
        isLoading, isOnChain: data?.[0]?.status === "success",
    };
}

// 
// HOOK: useVolunteerHolders
// Scans RewardReleased logs  fetches eth_getBalance for each unique volunteer
// 
function useVolunteerHolders(connectedAddress?: string) {
    const [dist, setDist] = useState<HolderDist | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const client = usePublicClient();

    const refresh = useCallback(async () => {
        if (!client) return;
        setLoading(true);
        setError(null);
        try {
            // Step 1: Get all RewardReleased logs
            const logs = await client.getLogs({
                address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`,
                event: REWARD_RELEASED_EVENT,
                fromBlock: BigInt(0),
                toBlock: "latest",
            }).catch(() => []);

            // Step 2: Get Ledger Leaderboard (best way to find active people)
            const leaderboard = await client.readContract({
                address: CONTRACTS.REPUTATION_LEDGER as `0x${string}`,
                abi: REPUTATION_LEDGER_ABI,
                functionName: "getLeaderboardPage",
                args: [BigInt(0), BigInt(50)],
            }) as [readonly string[], readonly bigint[], readonly bigint[]];

            const addrSet = new Set<string>();
            const earnedMap = new Map<string, number>();

            // Add from logs
            for (const log of logs) {
                const { volunteer, tokenReward } = log.args as { volunteer: string; tokenReward: bigint };
                const a = volunteer.toLowerCase();
                addrSet.add(a);
                earnedMap.set(a, (earnedMap.get(a) ?? 0) + Number(formatEther(tokenReward)));
            }
            // Add from leaderboard
            for (const a of leaderboard[0]) { addrSet.add(a.toLowerCase()); }
            // Always include me
            if (connectedAddress) addrSet.add(connectedAddress.toLowerCase());

            const addresses = Array.from(addrSet);

            // Step 3: Parallel balance fetch
            const balances = await Promise.all(
                addresses.map(addr =>
                    client.getBalance({ address: addr as `0x${string}` })
                        .then(b => Number(formatEther(b)))
                        .catch(() => 0)
                )
            );

            // Step 4: Build list
            const holders: HolderEntry[] = addresses.map((addr, i) => ({
                address: addr,
                balance: balances[i],
                share_pct: 0,
                total_earned: earnedMap.get(addr) ?? 0,
            })).sort((a, b) => b.balance - a.balance);

            const distributedSupply = holders.reduce((s, h) => s + h.balance, 0);

            setDist({
                total_unique_volunteers: addresses.length,
                total_events_verified: logs.length,
                top_holders: holders.map(h => ({
                    ...h,
                    share_pct: distributedSupply > 0 ? (h.balance / distributedSupply) * 100 : 0
                })),
                distributed_supply: distributedSupply,
                fetched_at: Date.now(),
            });
        } catch (e: any) {
            setError(e.message ?? "Failed to scan participants");
        } finally {
            setLoading(false);
        }
    }, [client, connectedAddress]);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 60_000);
        return () => clearInterval(id);
    }, [refresh]);

    return { dist, loading, error, refresh };
}

// 
// UI COMPONENTS
// 
function MetricCard({ label, value, sub, color }: {
    label: string; value: string; sub?: string; color?: string;
}) {
    return (
        <div style={{
            padding: "16px", borderRadius: "12px", background: "var(--g1)",
            border: "1px solid var(--b0)", display: "flex", flexDirection: "column",
            justifyContent: "center"
        }}>
            <p style={{ fontSize: "11px", color: "var(--t2)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>{label}</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 700, color: color || "var(--t0)" }}>{value}</p>
            {sub && <p style={{ fontSize: "11px", color: "var(--t2)", marginTop: "6px" }}>{sub}</p>}
        </div>
    );
}

function SufferingBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "var(--t1)" }}>{label}</span>
                <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color }}>
                    {(value * 100).toFixed(1)}%
                </span>
            </div>
            <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.05)" }}>
                <div style={{ height: "100%", width: `${value * 100}%`, borderRadius: "2px", background: color, transition: "width 0.8s ease" }} />
            </div>
        </div>
    );
}

function SupplyProgressBar({ current, max, userShare, userBalance, phase }: {
    current: number; max: number; userShare: number;
    userBalance: number; phase: string;
}) {
    const pct = Math.min((current / max) * 100, 100);
    return (
        <div style={{
            padding: "20px", borderRadius: "16px", background: "var(--g1)",
            border: "1px solid var(--b0)", marginBottom: "20px",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                    <span style={{ fontSize: "12px", color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Live Supply Tracker
                    </span>

                    <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--t0)", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>
                        {current.toLocaleString("en-US", { maximumFractionDigits: 2 })} / {max.toLocaleString("en-US", { maximumFractionDigits: 0 })} HAVEN
                    </p>
                </div>
                <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", background: "var(--mi)20", color: "var(--mi)" }}>
                        {phase}
                    </span>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--t0)", marginTop: "6px" }}>{userShare.toFixed(4)}%</p>
                    <p style={{ fontSize: "11px", color: "var(--t2)", marginTop: "2px" }}>
                        {userBalance.toLocaleString("en-US", { maximumFractionDigits: 4 })} HAVEN
                    </p>
                </div>
            </div>
            <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", top: 0, left: 0, height: "100%", width: `${pct}%`,
                    background: pct > 90 ? "#ff6b6b" : pct > 70 ? "#ff9f43" : "var(--mi)",
                    borderRadius: "4px", transition: "width 1s ease-in-out",
                }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                <span style={{ fontSize: "10px", color: "var(--t2)" }}>0%</span>
                <span style={{ fontSize: "10px", color: "var(--t2)" }}>Annual Mint Cap (100%)</span>
            </div>
        </div>
    );
}

function shortAddr(a: string) { return `${a.slice(0, 6)}${a.slice(-4)}`; }

function VolunteerHolderPanel({ dist, loading, error, connectedAddress, totalMinted }: {
    dist: HolderDist | null; loading: boolean; error: string | null;
    connectedAddress?: string; totalMinted: number;
}) {
    if (loading && !dist) return (
        <div style={{ padding: "16px", borderRadius: "var(--r2)", background: "var(--g1)", border: "1px solid var(--b0)", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--mi)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                <p style={{ fontSize: "12px", color: "var(--t2)" }}>Scanning RewardReleased events on-chain</p>
            </div>
        </div>
    );
    if (error && !dist) return (
        <div style={{ padding: "16px", borderRadius: "var(--r2)", background: "var(--g1)", border: "1px solid #ff6b6b40", marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", color: "#ff6b6b" }}> Event scan failed: {error}</p>
            <p style={{ fontSize: "11px", color: "var(--t2)", marginTop: "4px" }}>
                Butuh archive node (NEXT_PUBLIC_FUJI_RPC_URL) untuk getLogs dari block 0.
            </p>
        </div>
    );
    if (!dist) return null;

    const distPct = totalMinted > 0 ? (dist.distributed_supply / totalMinted) * 100 : 0;
    const unaccounted = Math.max(0, totalMinted - dist.distributed_supply);

    return (
        <div style={{ padding: "20px", borderRadius: "var(--r3)", background: "var(--g1)", border: "1px solid var(--b0)", marginBottom: "16px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                    <p style={{ fontWeight: 700, color: "var(--t0)", fontSize: "14px" }}>Volunteer Wallet Distribution</p>
                    <p style={{ fontSize: "11px", color: "var(--t2)", marginTop: "2px" }}>
                        {dist.total_unique_volunteers.toLocaleString()} unique volunteers
                        &nbsp;&nbsp;{dist.total_events_verified.toLocaleString()} verified events
                        &nbsp;&nbsp;updated {new Date(dist.fetched_at).toLocaleTimeString()}
                    </p>
                </div>
                <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "11px", color: "var(--t2)" }}>In active wallets</p>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 700, color: "var(--mi)" }}>
                        {dist.distributed_supply.toLocaleString("en-US", { maximumFractionDigits: 2 })} HAVEN
                    </p>
                </div>
            </div>

            {/* Distribution bar */}
            <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--t2)" }}>In volunteer wallets ({distPct.toFixed(1)}%)</span>
                    <span style={{ fontSize: "11px", color: "var(--t2)", opacity: 0.6 }}>Unaccounted</span>
                </div>
                <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${distPct}%`, background: "var(--mi)", borderRadius: "3px", transition: "width 1s ease-in-out" }} />
                </div>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                    <span style={{ fontSize: "10px", color: "var(--t2)" }}>
                        Active: {dist.distributed_supply.toLocaleString("en-US", { maximumFractionDigits: 2 })} HAVEN
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--t2)", opacity: 0.5 }}>
                        Other: {unaccounted.toLocaleString("en-US", { maximumFractionDigits: 2 })} HAVEN
                    </span>
                </div>
            </div>

            {/* Holder table */}
            <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--b0)" }}>
                            {["#", "VOLUNTEER", "BALANCE", "TOTAL EARNED", "SHARE"].map((h, i) => (
                                <th key={h} style={{
                                    textAlign: i < 2 ? "left" : "right",
                                    fontSize: "10px", color: "var(--t2)",
                                    letterSpacing: "0.08em", padding: "0 0 6px", fontWeight: 600,
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dist.top_holders.slice(0, 25).map((h, i) => {
                            const isMe = connectedAddress && h.address.toLowerCase() === connectedAddress.toLowerCase();
                            return (
                                <tr key={h.address} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                    <td style={{ padding: "7px 0", fontSize: "11px", color: "var(--t2)", width: "24px" }}>{i + 1}</td>
                                    <td style={{ padding: "7px 8px 7px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: isMe ? "var(--mi)" : "var(--t1)" }}>
                                        {shortAddr(h.address)}
                                        {isMe && <span style={{ marginLeft: "6px", fontSize: "9px", background: "var(--mi)20", color: "var(--mi)", padding: "1px 5px", borderRadius: "3px" }}>YOU</span>}
                                    </td>
                                    <td style={{ padding: "7px 0", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--t0)" }}>
                                        {h.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                                    </td>
                                    <td style={{ padding: "7px 0 7px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: h.total_earned > h.balance ? "var(--t2)" : "#6bff9e" }}>
                                        {h.total_earned.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: "7px 0", textAlign: "right", fontSize: "12px", color: h.share_pct > 5 ? "#ff9f43" : "var(--t2)" }}>
                                        {h.share_pct.toFixed(3)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p style={{ fontSize: "10px", color: "var(--t2)", marginTop: "10px" }}>
                Scanned from on-chain RewardReleased events  Avalanche Fuji C-Chain  auto-refresh tiap 60 detik
            </p>
        </div>
    );
}

// 
// MAIN COMPONENT
// 
export default function EconomyDashboard() {
    const [economy, setEconomy] = useState<EconomyData | null>(null);
    const [flywheel, setFlywheel] = useState<FlywheelData | null>(null);
    const [apiLoading, setApiLoading] = useState(true);
    const { address } = useAccount();

    // On-chain native supply
    const { totalMinted, deadBurned, crisisLocked, totalDonated, liveSupply, eventsVerified, totalParticipants, totalImpactScore, isLoading: supplyLoading, isOnChain } = useNativeSupplyStats();

    // User native balance
    const { data: userData } = useBalance({ address, query: { refetchInterval: 8_000 } });
    const userBalance = userData ? Number(userData.formatted) : 0;

    // Volunteer holder distribution
    const { dist, loading: holderLoading, error: holderError } = useVolunteerHolders(address);

    // Effective values (on-chain preferred, Redis fallback)
    const effMinted = totalMinted ?? flywheel?.total_minted ?? 0;

    // The sum of all discovered volunteer wallet balances
    const activeWalletBalances = dist?.distributed_supply || 0;
    const globalEcosystemBalance = activeWalletBalances; // This is the total native HAVEN in circulation according to our scan


    // The user wants the main tracker to be globalEcosystemBalance.
    const effLive = globalEcosystemBalance;


    const effBurned = deadBurned > 0 ? deadBurned : (flywheel?.total_burned ?? 0);
    const deflPct = effMinted > 0 ? (effBurned / effMinted) * 100 : 0;
    // Cap user share to 100% physically if maths glitches from test tokens
    const userShare = Math.min(100, effLive > 0 ? (userBalance / effLive) * 100 : (userBalance > 0 ? 100 : 0));

    const daysSince = Math.max(1, (Date.now() - new Date("2026-02-20").getTime()) / 86_400_000);
    const burnRate = (flywheel?.burn_rate_30d || 0) > 0 ? flywheel!.burn_rate_30d : (effBurned / daysSince);

    // Oracle API
    useEffect(() => {
        Promise.all([
            hFetch("/api/v1/economy/status").then(r => r.json()),
            hFetch("/api/v1/economy/flywheel").then(r => r.json()),
        ]).then(([eco, fly]) => { setEconomy(eco); setFlywheel(fly); })
            .catch(() => { }).finally(() => setApiLoading(false));
    }, []);

    if (apiLoading && supplyLoading) return (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--t2)" }}>
            <p style={{ fontSize: "13px" }}>Loading economy data</p>
        </div>
    );

    const health = economy?.economy_health || "early_stage";
    const healthClr = HEALTH_COLORS[health] || "var(--t1)";
    const suffering = economy?.mint_cap?.suffering_index;
    const mintCap = economy?.mint_cap;
    const maxAnnualCap = mintCap?.annual_mint_cap ?? 191_200_000;

    let phase = "Early Accumulation";
    if (deflPct > 100) phase = "Hyper Deflationary";
    else if (deflPct > 50) phase = "Deflationary Crunch";
    else if (effLive > maxAnnualCap * 0.9) phase = "Supply Squeeze";
    else if (effLive > maxAnnualCap * 0.5) phase = "Healthy Expansion";

    return (
        <>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
            <div style={{ maxWidth: "780px" }}>

                {/* Header */}
                <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--t0)", margin: 0 }}>Economy Flywheel</h2>
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px", color: healthClr, background: `${healthClr}18`, border: `1px solid ${healthClr}40`, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            {health.replace(/_/g, " ")}
                        </span>
                        {isOnChain && (
                            <span style={{ fontSize: "10px", color: "var(--t2)", display: "flex", alignItems: "center", gap: "4px", border: "1px solid var(--b0)", padding: "2px 8px", borderRadius: "10px" }}>
                                ONLINE
                            </span>
                        )}
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--t2)" }}>
                        Layer 2 Living Economy  Native HAVEN coin  NativeMinter Precompile  mint cap = f(global suffering index)  base_rate
                    </p>
                </div>

                {/* Live Supply Bar */}
                <SupplyProgressBar current={effLive} max={maxAnnualCap} userShare={userShare} userBalance={userBalance} phase={phase} />

                {/* Row 1: 4 main supply metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "12px" }}>
                    <MetricCard label="Global Ecosystem Balance" value={`${globalEcosystemBalance.toLocaleString("en-US", { maximumFractionDigits: 4 })} HAVEN`} sub="All Active Wallet Holdings" color="var(--mi)" />
                    <MetricCard label="Total Lifetime Minted" value={`${effMinted.toLocaleString("en-US", { maximumFractionDigits: 4 })} HAVEN`} sub="Minted via Protocol Vault" color="var(--t1)" />
                    <MetricCard label="Burned (0xdead)" value={`${effBurned.toLocaleString("en-US", { maximumFractionDigits: 4 })} HAVEN`} sub={`${deflPct.toFixed(2)}% deflation`} color="#6bff9e" />
                </div>

                {/* Row 2: 3 secondary metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
                    <MetricCard label="Vault Balance" value={totalMinted !== null ? `${totalMinted.toLocaleString("en-US", { maximumFractionDigits: 4 })} HAVEN` : "--"} sub="Funds available in Vault" color="var(--mi)" />
                    <MetricCard label="Burn Rate / 30d" value={`${burnRate.toFixed(4)} /day`} sub={flywheel?.velocity?.flywheel_health?.replace(/_/g, " ")} color="var(--go)" />
                    <MetricCard label="Active Volunteers" value={(totalParticipants || 0).toLocaleString()} sub="Registered on ReputationLedger" color="var(--t1)" />
                </div>

                {/* Volunteer Wallet Distribution */}
                <VolunteerHolderPanel dist={dist} loading={holderLoading} error={holderError} connectedAddress={address} totalMinted={effMinted} />

                {/* Economy Grid */}
                {mintCap && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                        <MetricCard label="Annual Mint Cap" value={`${(maxAnnualCap / 1e6).toFixed(2)}M HAVEN`} sub={`Phase: ${mintCap.phase}`} color="var(--vi)" />
                        <MetricCard label="Deflation Pressure" value={`${(mintCap.deflation_pressure * 100).toFixed(2)}%`} sub="from idle token decay" color={mintCap.deflation_pressure > 0.3 ? "#6bff9e" : "var(--t1)"} />
                    </div>
                )}

                {/* Global Suffering Index */}
                {suffering && (
                    <div style={{ padding: "20px", borderRadius: "var(--r3)", background: "var(--g1)", border: "1px solid var(--b0)", marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <p style={{ fontWeight: 700, color: "var(--t0)", fontSize: "14px" }}>Global Suffering Index</p>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, color: suffering.composite > 0.6 ? "#ff9f43" : "var(--mi)" }}>
                                {(suffering.composite * 100).toFixed(1)}%
                            </span>
                        </div>
                        <SufferingBar label="Famine Severity" value={suffering.famine_score} color="#ff9f43" />
                        <SufferingBar label="Displacement" value={suffering.displacement_score} color="#ff6b6b" />
                        <SufferingBar label="Disaster Score" value={suffering.disaster_score} color="var(--vi)" />
                        <p style={{ fontSize: "11px", color: "var(--t2)", marginTop: "8px" }}>
                            Live data from GDACS  OCHA  UNHCR    Higher index = higher token rewards
                        </p>
                    </div>
                )}

                {/* Triple Velocity */}
                {economy?.velocity && (
                    <div style={{ padding: "16px", borderRadius: "var(--r2)", background: "var(--g1)", border: "1px solid var(--b0)" }}>
                        <p style={{ fontWeight: 700, color: "var(--t0)", fontSize: "13px", marginBottom: "12px" }}>Triple Velocity Model</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                            {[
                                { label: "Velocity Bonus", value: `${economy.velocity.velocity_bonus.toFixed(3)}`, color: "var(--mi)" },
                                { label: "Idle Decay / yr", value: `${(economy.velocity.idle_decay_annual * 100).toFixed(1)}%`, color: "#ff9f43" },
                                { label: "Reflex Bonus", value: `${(economy.velocity.reflex_bonus * 100).toFixed(1)}%`, color: "#6bff9e" },
                            ].map(item => (
                                <div key={item.label} style={{ textAlign: "center" }}>
                                    <p style={{ fontSize: "10px", color: "var(--t2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>{item.label}</p>
                                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 700, color: item.color }}>{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}

