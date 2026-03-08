import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SOVEREIGN_ID_ABI } from "@/utils/abis";
import { CONTRACTS } from "@/utils/constants";
import { stringToHex, type Hex } from "viem";

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.1)",
  fontFamily: M, fontSize: "12px", color: "rgba(255,255,255,0.85)",
  outline: "none", boxSizing: "border-box" as const, borderRadius: "0",
  transition: "border-color 0.15s",
};

function LabelRow({ text, note }: { text: string; note?: string }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <p style={{
        fontFamily: S, fontStyle: "italic", fontSize: "11px",
        color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em",
      }}>{text}</p>
      {note && (
        <p style={{
          fontFamily: S, fontSize: "10px",
          color: "rgba(255,255,255,0.2)", marginTop: "2px",
        }}>{note}</p>
      )}
    </div>
  );
}

export default function MintIdentityCard() {
  const { address } = useAccount();
  const [countryIso, setCountryIso] = useState("ID");
  const [didDocument, setDidDocument] = useState("ipfs://QmYourSelfSovereignDID");
  const [vouchersInput, setVouchersInput] = useState("");
  const [isGenesis, setIsGenesis] = useState(false);

  const biometricHash = stringToHex("simulated-bio-" + Math.floor(Math.random() * 10000), { size: 32 });

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    let vouchers: Hex[] = [];
    if (!isGenesis && vouchersInput.trim() !== "") {
      vouchers = vouchersInput.split(",")
        .map(v => v.trim())
        .filter(v => v.startsWith("0x") && v.length === 42) as Hex[];
      if (vouchers.length !== 3) {
        alert("You must provide exactly 3 valid wallet addresses as vouchers.");
        return;
      }
    }
    writeContract({
      address: CONTRACTS.SOVEREIGN_ID as Hex,
      abi: SOVEREIGN_ID_ABI,
      functionName: "issueIdentity",
      args: [address as Hex, didDocument, countryIso, biometricHash, vouchers],
    });
  };

  if (isSuccess) {
    return (
      <div style={{ maxWidth: "480px" }}>
        <div style={{
          padding: "40px 32px",
          border: "1px solid rgba(255,255,255,0.2)",
          borderTop: "2px solid #fff",
          background: "rgba(255,255,255,0.025)",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: S, fontSize: "9px", fontStyle: "italic",
            letterSpacing: "0.25em", color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase", marginBottom: "20px",
          }}>Identity Confirmed</p>
          <h3 style={{
            fontFamily: S, fontWeight: 400, fontSize: "24px",
            color: "#fff", marginBottom: "12px",
          }}>SovereignID Issued</h3>
          <p style={{
            fontFamily: M, fontSize: "10px",
            color: "rgba(255,255,255,0.35)", marginBottom: "28px",
            letterSpacing: "0.08em",
          }}>
            {hash?.slice(0, 14)}…{hash?.slice(-10)}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 40px",
              background: "#fff", border: "none", color: "#000",
              fontFamily: S, fontSize: "12px", letterSpacing: "0.18em",
              textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Enter Protocol
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Identity Initialisation</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>
        <h2 style={{
          fontFamily: S, fontWeight: 400, fontSize: "28px",
          color: "#fff", marginBottom: "10px",
        }}>Issue SovereignID</h2>
        <p style={{
          fontFamily: S, fontStyle: "italic", fontSize: "13px",
          color: "rgba(255,255,255,0.35)", lineHeight: 1.75,
        }}>
          To participate in the HAVEN Economy, your digital personhood must be
          established on-chain via the Social Graph Sybil-resistance mechanism.
        </p>
      </div>

      <div style={{
        padding: "32px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderTop: "2px solid rgba(255,255,255,0.4)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Country */}
          <div>
            <LabelRow text="Country of Jurisdiction" />
            <select
              value={countryIso}
              onChange={e => setCountryIso(e.target.value)}
              style={{ ...fieldStyle, background: "rgba(255,255,255,0.03)" }}
            >
              <option value="ID">Indonesia (ID)</option>
              <option value="US">United States (US)</option>
              <option value="SG">Singapore (SG)</option>
            </select>
          </div>

          {/* Genesis flag */}
          <div style={{
            padding: "16px",
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.01)",
          }}>
            <label style={{
              display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer",
            }}>
              <input
                type="checkbox" checked={isGenesis}
                onChange={e => setIsGenesis(e.target.checked)}
                style={{ marginTop: "2px", accentColor: "#fff" }}
              />
              <div>
                <p style={{
                  fontFamily: S, fontSize: "13px",
                  color: "rgba(255,255,255,0.7)", marginBottom: "4px",
                }}>Genesis Member Status</p>
                <p style={{
                  fontFamily: S, fontStyle: "italic", fontSize: "11px",
                  color: "rgba(255,255,255,0.3)", lineHeight: 1.6,
                }}>
                  Only the first three identities may claim Genesis status, bypassing
                  the voucher requirement. Select only if you are a founding participant.
                </p>
              </div>
            </label>
          </div>

          {/* Vouchers */}
          {!isGenesis && (
            <div>
              <LabelRow
                text="Social Vouchers (required)"
                note="Exactly three verified wallet addresses, comma-separated"
              />
              <textarea
                required={!isGenesis}
                value={vouchersInput}
                onChange={e => setVouchersInput(e.target.value)}
                placeholder="0x1234…, 0xabcd…, 0x5678…"
                rows={3}
                style={{ ...fieldStyle, resize: "vertical" as const, lineHeight: 1.7 }}
                onFocus={e => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "14px 16px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.02)",
            }}>
              <p style={{
                fontFamily: S, fontStyle: "italic", fontSize: "11px",
                color: "rgba(255,255,255,0.5)", lineHeight: 1.6,
              }}>
                Error: {(error as any).shortMessage || error.message}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={e => handleMint(e as any)}
            disabled={isPending || isConfirming}
            style={{
              padding: "14px 32px",
              background: (isPending || isConfirming) ? "rgba(255,255,255,0.08)" : "#fff",
              border: "none",
              color: (isPending || isConfirming) ? "rgba(255,255,255,0.25)" : "#000",
              fontFamily: S, fontSize: "12px", letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: (isPending || isConfirming) ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              width: "100%",
            }}
            onMouseEnter={e => {
              if (!isPending && !isConfirming)
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
            }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            {isPending ? "Confirming in Wallet…"
              : isConfirming ? "Issuing Identity…"
              : "Issue Digital Identity"}
          </button>
        </div>
      </div>
    </div>
  );
}