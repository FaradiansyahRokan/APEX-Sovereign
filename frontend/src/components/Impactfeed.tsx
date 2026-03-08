"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { BENEVOLENCE_VAULT_ABI } from "../utils/abis";
import { CONTRACTS } from "../utils/constants";
import { motion, AnimatePresence } from "framer-motion";

interface FeedEv {
  eventId: string; volunteer: string;
  impactScore: number; tokenReward: number;
  txHash: string; blockNumber: bigint; timestamp: number;
}

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

function ago(ts: number): string {
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function ScoreTag({ score }: { score: number }) {
  const intensity = score >= 80 ? 0.9 : score >= 60 ? 0.6 : 0.35;
  return (
    <div style={{
      width: "52px", height: "52px", flexShrink: 0,
      border: `1px solid rgba(255,255,255,${score >= 80 ? 0.25 : 0.08})`,
      background: `rgba(255,255,255,${score >= 80 ? 0.04 : 0.01})`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      <span style={{
        fontFamily: M, fontSize: "15px", fontWeight: 400,
        color: `rgba(255,255,255,${intensity})`,
        lineHeight: 1,
      }}>{score.toFixed(0)}</span>
      <span style={{
        fontFamily: S, fontSize: "7px", fontStyle: "italic",
        color: "rgba(255,255,255,0.25)", marginTop: "2px",
      }}>score</span>
    </div>
  );
}

export default function ImpactFeed() {
  const client = usePublicClient();
  const [events, setEvents] = useState<FeedEv[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCnt, setNewCnt] = useState(0);

  useEffect(() => {
    if (!client) return;
    (async () => {
      try {
        const logs = await client.getLogs({
          address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`,
          event: {
            type: "event", name: "RewardReleased",
            inputs: [
              { type: "bytes32", name: "eventId", indexed: true },
              { type: "address", name: "volunteer", indexed: true },
              { type: "address", name: "beneficiary", indexed: true },
              { type: "uint256", name: "impactScore" },
              { type: "uint256", name: "tokenReward" },
              { type: "bytes32", name: "zkProofHash" },
              { type: "bytes32", name: "eventHash" },
              { type: "uint256", name: "timestamp" },
            ],
          },
          fromBlock: "earliest", toBlock: "latest",
        });
        setEvents(logs.map((l: any) => ({
          eventId: l.args.eventId,
          volunteer: l.args.volunteer,
          impactScore: Number(l.args.impactScore) / 100,
          tokenReward: Number(formatUnits(l.args.tokenReward, 18)),
          txHash: l.transactionHash,
          blockNumber: l.blockNumber,
          timestamp: Number(l.args.timestamp),
        })).reverse());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [client]);

  useEffect(() => {
    if (!client) return;
    const unsub = client.watchContractEvent({
      address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`,
      abi: BENEVOLENCE_VAULT_ABI, eventName: "RewardReleased",
      onLogs: (logs: any[]) => {
        const ne = logs.map(l => ({
          eventId: l.args.eventId, volunteer: l.args.volunteer,
          impactScore: Number(l.args.impactScore) / 100,
          tokenReward: Number(formatUnits(l.args.tokenReward, 18)),
          txHash: l.transactionHash, blockNumber: l.blockNumber,
          timestamp: Number(l.args.timestamp),
        }));
        setEvents(p => [...ne, ...p]);
        setNewCnt(c => c + ne.length);
        setTimeout(() => setNewCnt(0), 4000);
      },
    });
    return () => unsub();
  }, [client]);

  return (
    <div style={{ maxWidth: "720px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Transaction Record</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: "rgba(255,255,255,0.6)",
              animation: "lbPulse 2.6s ease-in-out infinite",
            }} />
            <span style={{
              fontFamily: M, fontSize: "8px", letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.3)",
            }}>LIVE</span>
          </div>
        </div>

        <h2 style={{
          fontFamily: S, fontWeight: 400, fontSize: "30px",
          color: "#fff", letterSpacing: "0.01em",
        }}>
          {events.length.toLocaleString()}
          <span style={{ fontSize: "18px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}> settlements on-chain</span>
        </h2>

        {newCnt > 0 && (
          <p style={{
            fontFamily: S, fontStyle: "italic", fontSize: "12px",
            color: "rgba(255,255,255,0.5)", marginTop: "6px",
          }}>
            +{newCnt} new transaction{newCnt > 1 ? "s" : ""} received
          </p>
        )}
      </div>

      {/* Feed table */}
      <div style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "2px solid rgba(255,255,255,0.4)",
      }}>
        {/* Col headers */}
        <div style={{
          display: "grid", gridTemplateColumns: "52px 1fr 110px 90px",
          padding: "10px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.02)",
        }}>
          {["Score", "Participant", "Reward", "Time"].map((h, i) => (
            <p key={h} style={{
              fontFamily: S, fontStyle: "italic", fontSize: "10px",
              color: "rgba(255,255,255,0.28)", letterSpacing: "0.08em",
              textAlign: i === 3 ? "right" : "left",
            }}>{h}</p>
          ))}
        </div>

        {loading && (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <p style={{
              fontFamily: S, fontStyle: "italic", fontSize: "14px",
              color: "rgba(255,255,255,0.25)",
            }}>Scanning blockchain records…</p>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ padding: "80px 40px", textAlign: "center" }}>
            <p style={{
              fontFamily: S, fontStyle: "italic", fontSize: "15px",
              color: "rgba(255,255,255,0.25)", marginBottom: "8px",
            }}>The ledger is empty.</p>
            <p style={{ fontFamily: S, fontSize: "12px", color: "rgba(255,255,255,0.15)" }}>
              Submit a verified impact proof to record the first transaction.
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {!loading && events.map((ev, i) => (
            <motion.div key={ev.txHash + i}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i < 10 ? i * 0.04 : 0 }}
              style={{
                display: "grid", gridTemplateColumns: "52px 1fr 110px 90px",
                padding: "14px 20px", alignItems: "center",
                borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                position: "relative",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
            >
              {/* Latest marker */}
              {i === 0 && (
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: "2px", background: "rgba(255,255,255,0.4)",
                }} />
              )}

              <ScoreTag score={ev.impactScore} />

              <div style={{ minWidth: 0, paddingLeft: "4px" }}>
                <p style={{
                  fontFamily: M, fontSize: "11px",
                  color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em",
                  marginBottom: "4px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ev.volunteer.slice(0, 10)}…{ev.volunteer.slice(-8)}
                </p>
                <p style={{
                  fontFamily: M, fontSize: "9px",
                  color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em",
                }}>Block #{ev.blockNumber.toString()}</p>
              </div>

              <p style={{
                fontFamily: M, fontSize: "12px",
                color: "rgba(255,255,255,0.7)",
              }}>+{ev.tokenReward.toFixed(2)}</p>

              <p style={{
                fontFamily: S, fontStyle: "italic", fontSize: "11px",
                color: "rgba(255,255,255,0.3)",
                textAlign: "right",
              }}>{ago(ev.timestamp)}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes lbPulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.35;transform:scale(0.6)}
        }
      `}</style>
    </div>
  );
}