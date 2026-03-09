"use client";

import { useState } from "react";
import { useBalance } from "wagmi";
import { useSigner } from "@/contexts/SignerContext";
import { ethers } from "ethers";
import { isAddress } from "viem";

interface TxRecord { to: string; amount: string; time: number; status: "ok" | "err"; }

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "var(--hv-bg2)",
  border: "1px solid var(--hv-border2)",
  borderRadius: "0",
  fontFamily: M, fontSize: "12px",
  color: "var(--hv-t2)",
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box" as const,
};

function Label({ text }: { text: string }) {
  return (
    <p style={{
      fontFamily: S, fontSize: "10px", fontStyle: "italic",
      letterSpacing: "0.1em", color: "var(--hv-t4)",
      marginBottom: "8px",
    }}>{text}</p>
  );
}

export default function P2PTransfer({ address }: { address: string }) {
  const { signer, isReady: signerReady } = useSigner();
  const [to, setTo]       = useState("");
  const [amount, setAmount] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<TxRecord[]>([]);

  const { data: nativeBal, refetch } = useBalance({
    address: address as `0x${string}`,
    query: { refetchInterval: 6_000 },
  });

  const [sendError, setSendError] = useState<Error | null>(null);
  const hash = txHash;

  const balNum = nativeBal ? Number(nativeBal.formatted) : 0;
  const balFmt = balNum.toLocaleString("en-US", { maximumFractionDigits: 4 });
  const amtNum = Number(amount) || 0;
  const validTo = to.length > 0 && isAddress(to);
  const validAmt = amtNum > 0 && amtNum < balNum;
  const canSend = validTo && validAmt && !isPending && !isConfirming && signerReady;
  const pct = balNum > 0 ? Math.min((amtNum / balNum) * 100, 100) : 0;
  const statusErr = errMsg || sendError?.message;

  const handleSend = async () => {
    if (!canSend || !signer) return;
    setErrMsg(""); setSendError(null); setIsSuccess(false);
    setIsPending(true);
    try {
      const tx = await signer.sendTransaction({
        to: to as `0x${string}`,
        value: ethers.parseEther(amount),
      });
      setTxHash(tx.hash);
      setIsPending(false); setIsConfirming(true);
      await tx.wait();
      setIsConfirming(false); setIsSuccess(true);
      setHistory(h => [{ to, amount, time: Date.now(), status: "ok" }, ...h.slice(0, 9)]);
      setTo(""); setAmount(""); refetch();
    } catch (e: any) {
      setIsPending(false); setIsConfirming(false);
      const msg = e.message?.slice(0, 120) || "Transfer failed";
      setErrMsg(msg); setSendError(e);
      setHistory(h => [{ to, amount, time: Date.now(), status: "err" }, ...h.slice(0, 9)]);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Capital Transfer</span>
          <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
        </div>
        <h2 style={{
          fontFamily: S, fontWeight: 400, fontSize: "30px",
          color: "var(--hv-text)", letterSpacing: "0.01em",
        }}>Peer-to-Peer Settlement</h2>
        <p style={{
          fontFamily: S, fontStyle: "italic", fontSize: "13px",
          color: "var(--hv-t4)", marginTop: "6px",
        }}>Direct native token transfer on the HAVEN L1 network</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "32px" }}>

        {/* ── Left: Form ── */}
        <div>
          {/* Balance display */}
          <div style={{
            padding: "28px",
            border: "1px solid var(--hv-border2)",
            borderTop: "2px solid var(--hv-rule)",
            marginBottom: "24px",
          }}>
            <p style={{
              fontFamily: S, fontSize: "10px", fontStyle: "italic",
              color: "var(--hv-t4)", letterSpacing: "0.12em",
              marginBottom: "10px",
            }}>Available Balance</p>
            <p style={{
              fontFamily: M, fontSize: "40px",
              color: "var(--hv-text)", letterSpacing: "-0.03em", lineHeight: 1,
            }}>
              {balFmt}
              <span style={{
                fontFamily: S, fontStyle: "italic", fontSize: "16px",
                color: "var(--hv-t4)", marginLeft: "10px",
              }}>STC</span>
            </p>

            {/* Amount allocation bar */}
            {amtNum > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ height: "1px", background: "var(--hv-surf2)", position: "relative" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${pct}%`, background: "var(--hv-action-bg)",
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <p style={{
                  fontFamily: S, fontSize: "10px", fontStyle: "italic",
                  color: "var(--hv-t4)", marginTop: "6px",
                }}>
                  {pct.toFixed(1)}% of balance allocated
                </p>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <Label text="Recipient Address" />
              <input
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="0x…"
                style={{
                  ...fieldStyle,
                  borderColor: to && !validTo ? "var(--hv-t4)" : "var(--hv-t5)",
                }}
                onFocus={e => { e.target.style.borderColor = "var(--hv-border-str)"; }}
                onBlur={e => { e.target.style.borderColor = to && !validTo ? "var(--hv-t4)" : "var(--hv-t5)"; }}
              />
              {to && !validTo && (
                <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)", marginTop: "6px" }}>
                  Invalid wallet address
                </p>
              )}
            </div>

            <div>
              <Label text="Amount (STC)" />
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0000"
                type="number"
                min="0"
                step="0.0001"
                style={fieldStyle}
                onFocus={e => { e.target.style.borderColor = "var(--hv-border-str)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--hv-border3)"; }}
              />
              {/* Quick amounts */}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                {[25, 50, 75, 100].map(p => (
                  <button key={p}
                    onClick={() => setAmount((balNum * p / 100).toFixed(4))}
                    style={{
                      padding: "5px 10px",
                      background: "transparent",
                      border: "1px solid var(--hv-border2)",
                      color: "var(--hv-t3)",
                      fontFamily: S, fontStyle: "italic", fontSize: "10px",
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={ev => {
                      (ev.currentTarget as HTMLButtonElement).style.background = "var(--hv-surf2)";
                      (ev.currentTarget as HTMLButtonElement).style.color = "var(--hv-t2)";
                    }}
                    onMouseLeave={ev => {
                      (ev.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (ev.currentTarget as HTMLButtonElement).style.color = "var(--hv-t3)";
                    }}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {statusErr && (
              <div style={{
                padding: "12px 16px",
                border: "1px solid var(--hv-border2)",
                background: "var(--hv-bg2)",
              }}>
                <p style={{
                  fontFamily: S, fontStyle: "italic", fontSize: "11px",
                  color: "var(--hv-t3)",
                }}>Error: {statusErr.slice(0, 100)}</p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                padding: "14px 32px",
                background: canSend ? "var(--hv-action-bg)" : "var(--hv-surf2)",
                border: "none",
                color: canSend ? "var(--hv-action-text)" : "var(--hv-t5)",
                fontFamily: S, fontSize: "12px", letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: canSend ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
              onMouseEnter={ev => { if (canSend) (ev.currentTarget as HTMLButtonElement).style.background = "var(--hv-surf2)"; }}
              onMouseLeave={ev => { if (canSend) (ev.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
            >
              {isPending ? "Awaiting Wallet Confirmation…"
                : isConfirming ? "Broadcasting Transaction…"
                : "Execute Transfer"}
            </button>

            {isSuccess && (
              <div style={{
                padding: "16px",
                border: "1px solid var(--hv-border3)",
                background: "var(--hv-surf)",
              }}>
                <p style={{
                  fontFamily: S, fontSize: "12px",
                  color: "var(--hv-t2)", marginBottom: "4px",
                }}>Transaction confirmed.</p>
                {hash && (
                  <p style={{ fontFamily: M, fontSize: "10px", color: "var(--hv-t4)" }}>
                    {hash?.slice(0, 18)}…{hash?.slice(-8)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: History ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <span style={{
              fontFamily: S, fontSize: "10px", fontStyle: "italic",
              color: "var(--hv-t4)", letterSpacing: "0.15em", textTransform: "uppercase",
            }}>Transaction Log</span>
            <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
          </div>

          {history.length === 0 ? (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              border: "1px solid var(--hv-border)",
            }}>
              <p style={{
                fontFamily: S, fontStyle: "italic", fontSize: "13px",
                color: "var(--hv-t4)",
              }}>No transactions recorded this session.</p>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--hv-border)", borderTop: "2px solid var(--hv-border3)" }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  padding: "14px 18px",
                  borderBottom: i < history.length - 1 ? "1px solid var(--hv-border)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "16px",
                }}>
                  <div>
                    <p style={{ fontFamily: M, fontSize: "10px", color: "var(--hv-t3)", marginBottom: "3px" }}>
                      {h.to.slice(0, 10)}…{h.to.slice(-6)}
                    </p>
                    <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)" }}>
                      {new Date(h.time).toLocaleTimeString()}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: M, fontSize: "13px", color: "var(--hv-t2)" }}>
                      {h.amount} STC
                    </p>
                    <p style={{
                      fontFamily: S, fontStyle: "italic", fontSize: "9px",
                      color: h.status === "ok" ? "var(--hv-t3)" : "var(--hv-t4)",
                      marginTop: "2px",
                    }}>
                      {h.status === "ok" ? "Settled" : "Failed"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}