import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SOVEREIGN_ID_ABI } from "@/utils/abis";
import { CONTRACTS } from "@/utils/constants";
import { stringToHex, type Hex } from "viem";

export default function MintIdentityCard() {
    const { address } = useAccount();
    const [countryIso, setCountryIso] = useState("ID");
    const [didDocument, setDidDocument] = useState("ipfs://QmYourSelfSovereignDID");

    // For the Genesis Bypass & Social Graph
    const [vouchersInput, setVouchersInput] = useState("");
    const [isGenesis, setIsGenesis] = useState(false);

    // In a real app we would capture face/voice. We simulate it here.
    const biometricHash = stringToHex("simulated-bio-" + Math.floor(Math.random() * 10000), { size: 32 });

    const { writeContract, data: hash, error, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault();

        // Parse vouchers input (comma separated addresses)
        let vouchers: Hex[] = [];
        if (!isGenesis && vouchersInput.trim() !== "") {
            vouchers = vouchersInput.split(",")
                .map(v => v.trim())
                .filter(v => v.startsWith("0x") && v.length === 42) as Hex[];

            if (vouchers.length !== 3) {
                alert("You must provide exactly 3 valid human-verified wallet addresses as vouchers (unless Genesis).");
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
            <div className="rise" style={{ padding: "24px", borderRadius: "16px", background: "var(--go-dim)", border: "1px solid var(--go)", textAlign: "center" }}>
                <h3 style={{ color: "var(--go)", marginBottom: "10px" }}>Identity Minted Successfully!</h3>
                <p style={{ color: "var(--t1)" }}>Tx Hash: {hash?.slice(0, 10)}...{hash?.slice(-8)}</p>
                <button onClick={() => window.location.reload()} style={{ marginTop: "16px", padding: "8px 16px", borderRadius: "8px", background: "var(--go)", color: "var(--void)", border: "none", cursor: "pointer", fontWeight: "bold" }}>Enter HAVEN Humanity</button>
            </div>
        );
    }

    return (
        <form onSubmit={handleMint} className="rise" style={{
            maxWidth: "500px", margin: "0 auto", padding: "1.5rem", borderRadius: "16px",
            background: "var(--g1)", border: "1px solid var(--b0)"
        }}>
            <h2 style={{ color: "var(--t0)", marginBottom: "16px", fontSize: "1.25rem", fontWeight: 700 }}>Initialize SovereignID</h2>
            <p style={{ color: "var(--t2)", marginBottom: "20px", fontSize: "14px", lineHeight: "1.5" }}>
                To participate in the HAVEN Economy, you must solidify your digital personhood on-chain via our Social Graph Sybil-resistance mechanism.
            </p>

            <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "var(--t1)", fontSize: "12px", marginBottom: "6px" }}>Country ISO Code:</label>
                <select value={countryIso} onChange={(e) => setCountryIso(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--void)", border: "1px solid var(--b0)", color: "var(--t0)" }}>
                    <option value="ID">Indonesia (ID)</option>
                    <option value="US">United States (US)</option>
                    <option value="SG">Singapore (SG)</option>
                </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
                <label style={{ color: "var(--t1)", fontSize: "12px", marginBottom: "6px", display: "flex", gap: "8px", alignItems: "center" }}>
                    <input type="checkbox" checked={isGenesis} onChange={(e) => setIsGenesis(e.target.checked)} />
                    I am a Genesis Member (Bypass Vouchers)
                </label>
                <p style={{ fontSize: "11px", color: "var(--t2)", marginTop: "4px" }}>Note: Only the first 3 identities ever minted can be Genesis.</p>
            </div>

            {!isGenesis && (
                <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", color: "var(--mi)", fontSize: "12px", marginBottom: "6px" }}>Social Vouchers (Required):</label>
                    <textarea
                        required={!isGenesis}
                        value={vouchersInput}
                        onChange={(e) => setVouchersInput(e.target.value)}
                        placeholder="0x123..., 0xabc..., 0x456..."
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--void)", border: "1px solid var(--b0)", color: "var(--t0)", minHeight: "80px", fontFamily: "monospace", fontSize: "12px" }}
                    />
                    <p style={{ fontSize: "11px", color: "var(--t2)", marginTop: "6px" }}>Enter exactly 3 wallet addresses separated by commas belonging to verifying humans who can vouch for you.</p>
                </div>
            )}

            {error && (
                <div style={{ background: "rgba(255, 100, 100, 0.1)", border: "1px solid rgba(255,100,100,0.3)", padding: "12px", borderRadius: "8px", marginBottom: "16px", color: "#ff8080", fontSize: "12px", wordBreak: "break-all" }}>
                    Error: {(error as any).shortMessage || error.message}
                </div>
            )}

            <button disabled={isPending || isConfirming} type="submit" style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--mi)", color: "var(--void)", border: "none", cursor: (isPending || isConfirming) ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "15px" }}>
                {isPending ? "Confirming in Wallet..." : isConfirming ? "Minting SovereignID..." : "Mint Digital Identity"}
            </button>
        </form>
    );
}
