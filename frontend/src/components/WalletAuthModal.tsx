"use client";

/**
 * HAVEN HUMANITY WalletAuthModal
 * =================================
 * Allows users to:
 *   1. CREATE a new wallet (generated locally, encrypted, stored in backend)
 *   2. LOGIN with private key (paste key → decrypt → connect to RPC)
 *
 * Works alongside existing MetaMask/RainbowKit ConnectButton.
 * Uses ethers.js v6 for wallet generation & signing.
 * 
 * BACKEND ENDPOINTS NEEDED (Python/FastAPI stubs at bottom of this file):
 *   POST /api/wallet/register  { address, encrypted_keystore }
 *   POST /api/wallet/login     { address }   (just records login timestamp)
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalStep =
  | "choose"         // Initial: Create or Import
  | "creating"       // Generating wallet...
  | "reveal"         // Show seed phrase + private key
  | "import"         // Paste private key to login
  | "set_password"   // Set encryption password (for new wallet)
  | "success";       // Connected!

interface HavenWallet {
  address: string;
  privateKey: string;
  mnemonic: string | null;
}

interface WalletAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (address: string, provider: ethers.JsonRpcProvider, signer: ethers.Wallet) => void;
  rpcUrl?: string;
}

// ── RPC URL ───────────────────────────────────────────────────────────────────
const DEFAULT_RPC = "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc";
const ORACLE_URL  = process.env.NEXT_PUBLIC_ORACLE_URL || "https://communication-app-harper-load.trycloudflare.com";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generateNewWallet(): Promise<HavenWallet> {
  const wallet   = ethers.Wallet.createRandom();
  return {
    address:    wallet.address,
    privateKey: wallet.privateKey,
    mnemonic:   wallet.mnemonic?.phrase ?? null,
  };
}

async function encryptAndStore(wallet: HavenWallet, password: string): Promise<string> {
  // Encrypt keystore with ethers
  const ethWallet  = new ethers.Wallet(wallet.privateKey);
  const keystore   = await ethWallet.encrypt(password);

  // Send encrypted keystore to backend
  try {
    const res = await fetch(`${ORACLE_URL}/api/wallet/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address:            wallet.address.toLowerCase(),
        encrypted_keystore: keystore,
      }),
    });
    if (!res.ok) throw new Error("Backend store failed");
  } catch (err) {
    // Non-fatal: wallet is still usable, just not backed up server-side
    console.warn("[HAVEN Wallet] Backend store failed, continuing:", err);
  }

  // Also cache in sessionStorage as fallback (cleared on tab close)
  if (typeof window !== "undefined") {
    sessionStorage.setItem(`haven_ks_${wallet.address.toLowerCase()}`, keystore);
  }

  return keystore;
}

function connectToRpc(privateKey: string, rpcUrl: string): { provider: ethers.JsonRpcProvider; signer: ethers.Wallet } {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer   = new ethers.Wallet(privateKey, provider);
  return { provider, signer };
}

function isValidPrivateKey(key: string): boolean {
  try {
    const k = key.trim().startsWith("0x") ? key.trim() : `0x${key.trim()}`;
    new ethers.Wallet(k);
    return true;
  } catch {
    return false;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      background: "none",
      border: "1px solid var(--hv-border3)",
      color: copied ? "var(--hv-text)" : "var(--hv-t3)",
      fontSize: "9px", letterSpacing: "0.2em",
      padding: "4px 12px", cursor: "pointer",
      fontFamily: "Georgia, serif",
      textTransform: "uppercase",
      transition: "all 0.2s",
    }}>
      {copied ? "✓ COPIED" : `COPY ${label}`}
    </button>
  );
}

function SecretBox({ label, value }: { label: string; value: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "9px", letterSpacing: "0.25em", color: "var(--hv-t4)", textTransform: "uppercase", fontFamily: "Georgia, serif" }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setRevealed(r => !r)} style={{
            background: "none", border: "1px solid var(--hv-border3)",
            color: "var(--hv-t4)", fontSize: "9px", letterSpacing: "0.2em",
            padding: "4px 12px", cursor: "pointer",
            fontFamily: "Georgia, serif", textTransform: "uppercase",
          }}>
            {revealed ? "HIDE" : "REVEAL"}
          </button>
          {revealed && <CopyButton text={value} label={label} />}
        </div>
      </div>
      <div style={{
        background: "var(--hv-surf)",
        border: "1px solid var(--hv-border)",
        padding: "14px 16px",
        fontFamily: "monospace",
        fontSize: "11px",
        color: revealed ? "var(--hv-surf2)" : "transparent",
        textShadow: revealed ? "none" : "0 0 12px var(--hv-border-str)",
        filter: revealed ? "none" : "blur(6px)",
        userSelect: revealed ? "text" : "none",
        wordBreak: "break-all",
        lineHeight: 1.7,
        transition: "all 0.3s",
        letterSpacing: revealed ? "0.04em" : "0",
        position: "relative",
        overflow: "hidden",
      }}>
        {value}
        {!revealed && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "9px", letterSpacing: "0.3em",
            color: "var(--hv-t4)", fontFamily: "Georgia, serif",
            textTransform: "uppercase", filter: "none",
          }}>
            HIDDEN FOR SECURITY
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function WalletAuthModal({ isOpen, onClose, onConnected, rpcUrl }: WalletAuthModalProps) {
  const rpc = rpcUrl || (typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_RPC_URL || DEFAULT_RPC) : DEFAULT_RPC);

  const [step,        setStep]        = useState<ModalStep>("choose");
  const [wallet,      setWallet]      = useState<HavenWallet | null>(null);
  const [password,    setPassword]    = useState("");
  const [password2,   setPassword2]   = useState("");
  const [importKey,   setImportKey]   = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [savedAck,    setSavedAck]    = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("choose"); setWallet(null); setPassword("");
      setPassword2(""); setImportKey(""); setError(""); setLoading(false); setSavedAck(false);
    }
  }, [isOpen]);

  // ── Step: Create new wallet ─────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const w = await generateNewWallet();
      setWallet(w);
      setStep("reveal");
    } catch (e: any) {
      setError("Failed to generate wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Step: Set password & encrypt ───────────────────────────────────────────
  const handleSetPassword = useCallback(async () => {
    if (!wallet) return;
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== password2) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError("");
    try {
      await encryptAndStore(wallet, password);
      const { provider, signer } = connectToRpc(wallet.privateKey, rpc);
      onConnected(wallet.address, provider, signer);
      setStep("success");
    } catch (e: any) {
      setError("Encryption failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [wallet, password, password2, rpc, onConnected]);

  // ── Step: Import / login with private key ──────────────────────────────────
  const handleImport = useCallback(async () => {
    setError("");
    const key = importKey.trim().startsWith("0x") ? importKey.trim() : `0x${importKey.trim()}`;
    if (!isValidPrivateKey(key)) {
      setError("Invalid private key. Please check and try again.");
      return;
    }
    setLoading(true);
    try {
      const ethWallet = new ethers.Wallet(key);
      const { provider, signer } = connectToRpc(key, rpc);

      // Notify backend of login (non-fatal if it fails)
      try {
        await fetch(`${ORACLE_URL}/api/wallet/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: ethWallet.address.toLowerCase() }),
        });
      } catch {}

      onConnected(ethWallet.address, provider, signer);
      setStep("success");
    } catch (e: any) {
      setError("Could not connect with this private key.");
    } finally {
      setLoading(false);
    }
  }, [importKey, rpc, onConnected]);

  if (!isOpen) return null;

  // ── Overlay ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: "#0a0a0a",
            border: "1px solid var(--hv-border2)",
            width: "100%", maxWidth: "480px",
            position: "relative",
            boxShadow: "0 40px 80px rgba(0,0,0,0.8)",
          }}
        >
          {/* Top accent bar */}
          <div style={{ height: "3px", background: "var(--hv-action-bg)", position: "absolute", top: 0, left: 0, right: 0 }} />

          {/* Header */}
          <div style={{
            padding: "32px 36px 24px",
            borderBottom: "1px solid var(--hv-border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: "var(--hv-t4)", textTransform: "uppercase", fontFamily: "Georgia, serif", marginBottom: "8px" }}>
                  Haven Humanity · Sovereign Access
                </p>
                <h2 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "20px", color: "var(--hv-text)", letterSpacing: "0.05em" }}>
                  {step === "choose"       && "Wallet Access"}
                  {step === "creating"     && "Generating Wallet"}
                  {step === "reveal"       && "Your Credentials"}
                  {step === "set_password" && "Secure Your Wallet"}
                  {step === "import"       && "Import Private Key"}
                  {step === "success"      && "Access Granted"}
                </h2>
              </div>
              <button onClick={onClose} style={{
                background: "none", border: "none",
                color: "var(--hv-t4)", cursor: "pointer",
                fontSize: "18px", lineHeight: 1, padding: "4px",
              }}>×</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "28px 36px 36px" }}>

            {/* ── CHOOSE ── */}
            {step === "choose" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "var(--hv-t4)", lineHeight: 1.7, marginBottom: "28px", fontStyle: "italic" }}>
                  Access HAVEN without a browser wallet extension. Your keys are generated locally and encrypted before storage.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button onClick={handleCreate} disabled={loading} style={{
                    background: "var(--hv-action-bg)", color: "var(--hv-action-text)",
                    border: "none", padding: "16px 24px",
                    fontFamily: "Georgia, serif", fontSize: "11px",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: "pointer", textAlign: "left",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "opacity 0.2s",
                    opacity: loading ? 0.6 : 1,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: "3px" }}>Create New Wallet</div>
                      <div style={{ fontSize: "9px", color: "rgba(0,0,0,0.5)", letterSpacing: "0.15em" }}>Generate address + seed phrase</div>
                    </div>
                    <span style={{ fontSize: "16px" }}>→</span>
                  </button>

                  <button onClick={() => setStep("import")} style={{
                    background: "transparent", color: "var(--hv-text)",
                    border: "1px solid var(--hv-border2)", padding: "16px 24px",
                    fontFamily: "Georgia, serif", fontSize: "11px",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: "pointer", textAlign: "left",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "border-color 0.2s",
                  }}>
                    <div>
                      <div style={{ fontWeight: 400, marginBottom: "3px" }}>Import Existing Wallet</div>
                      <div style={{ fontSize: "9px", color: "var(--hv-t4)", letterSpacing: "0.15em" }}>Paste your private key</div>
                    </div>
                    <span style={{ fontSize: "16px", opacity: 0.5 }}>→</span>
                  </button>
                </div>

                <div style={{
                  marginTop: "24px",
                  padding: "14px 16px",
                  background: "var(--hv-surf)",
                  border: "1px solid var(--hv-border)",
                }}>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "9px", color: "var(--hv-t4)", lineHeight: 1.7, letterSpacing: "0.05em" }}>
                    ⚡ Compatible with MetaMask any wallet created here can be imported into MetaMask using the private key or seed phrase.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── REVEAL (new wallet credentials) ── */}
            {step === "reveal" && wallet && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{
                  padding: "12px 16px", marginBottom: "24px",
                  background: "rgba(255,200,0,0.05)",
                  border: "1px solid rgba(255,200,0,0.15)",
                }}>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "10px", color: "rgba(255,200,0,0.7)", lineHeight: 1.7, letterSpacing: "0.05em" }}>
                    ⚠ Save these credentials NOW. They will not be shown again. Anyone with your private key has full access to your wallet.
                  </p>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.25em", color: "var(--hv-t4)", textTransform: "uppercase", fontFamily: "Georgia, serif", marginBottom: "8px" }}>
                    Wallet Address
                  </p>
                  <div style={{
                    background: "var(--hv-surf)",
                    border: "1px solid var(--hv-border)",
                    padding: "12px 16px",
                    fontFamily: "monospace", fontSize: "11px",
                    color: "var(--hv-t2)",
                    wordBreak: "break-all",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
                  }}>
                    <span>{wallet.address}</span>
                    <CopyButton text={wallet.address} label="Address" />
                  </div>
                </div>

                <SecretBox label="Private Key" value={wallet.privateKey} />
                {wallet.mnemonic && <SecretBox label="Seed Phrase (12 words)" value={wallet.mnemonic} />}

                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "24px" }}>
                  <input
                    type="checkbox"
                    checked={savedAck}
                    onChange={e => setSavedAck(e.target.checked)}
                    style={{ marginTop: "2px", accentColor: "var(--hv-action-bg)" }}
                  />
                  <span style={{ fontFamily: "Georgia, serif", fontSize: "10px", color: "var(--hv-t4)", lineHeight: 1.6, letterSpacing: "0.05em" }}>
                    I have saved my private key and seed phrase in a secure location. I understand that losing them means permanent loss of access.
                  </span>
                </label>

                <button
                  onClick={() => setStep("set_password")}
                  disabled={!savedAck}
                  style={{
                    background: savedAck ? "var(--hv-action-bg)" : "var(--hv-surf)",
                    color: savedAck ? "var(--hv-action-text)" : "var(--hv-t4)",
                    border: "none", padding: "14px 24px", width: "100%",
                    fontFamily: "Georgia, serif", fontSize: "11px",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: savedAck ? "pointer" : "not-allowed",
                    transition: "all 0.3s",
                  }}
                >
                  Continue Set Password →
                </button>
              </motion.div>
            )}

            {/* ── SET PASSWORD ── */}
            {step === "set_password" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "var(--hv-t4)", lineHeight: 1.7, marginBottom: "24px", fontStyle: "italic" }}>
                  Your private key will be encrypted with this password before being stored on our servers.
                </p>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "9px", letterSpacing: "0.25em", color: "var(--hv-t4)", textTransform: "uppercase", fontFamily: "Georgia, serif", display: "block", marginBottom: "8px" }}>
                    Encryption Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    placeholder="Minimum 8 characters"
                    autoFocus
                    style={{
                      width: "100%", background: "var(--hv-surf)",
                      border: "1px solid var(--hv-border2)",
                      color: "var(--hv-text)", padding: "12px 14px",
                      fontFamily: "Georgia, serif", fontSize: "13px",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label style={{ fontSize: "9px", letterSpacing: "0.25em", color: "var(--hv-t4)", textTransform: "uppercase", fontFamily: "Georgia, serif", display: "block", marginBottom: "8px" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={password2}
                    onChange={e => { setPassword2(e.target.value); setError(""); }}
                    placeholder="Re-enter password"
                    onKeyDown={e => e.key === "Enter" && handleSetPassword()}
                    style={{
                      width: "100%", background: "var(--hv-surf)",
                      border: `1px solid ${error ? "rgba(255,80,80,0.4)" : "var(--hv-border)"}`,
                      color: "var(--hv-text)", padding: "12px 14px",
                      fontFamily: "Georgia, serif", fontSize: "13px",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                {error && (
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "10px", color: "rgba(255,80,80,0.8)", marginBottom: "16px", letterSpacing: "0.05em" }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSetPassword}
                  disabled={loading || password.length < 8}
                  style={{
                    background: loading || password.length < 8 ? "var(--hv-surf)" : "var(--hv-action-bg)",
                    color: loading || password.length < 8 ? "var(--hv-t4)" : "var(--hv-action-text)",
                    border: "none", padding: "14px 24px", width: "100%",
                    fontFamily: "Georgia, serif", fontSize: "11px",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: loading || password.length < 8 ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  }}
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ width: "12px", height: "12px", border: "1.5px solid rgba(0,0,0,0.3)", borderTopColor: "var(--hv-action-text)", borderRadius: "50%" }}
                      />
                      Encrypting…
                    </>
                  ) : "Encrypt & Connect →"}
                </button>
              </motion.div>
            )}

            {/* ── IMPORT private key ── */}
            {step === "import" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "var(--hv-t4)", lineHeight: 1.7, marginBottom: "24px", fontStyle: "italic" }}>
                  Paste your private key to connect directly to the BridgeStone network. Your key is never sent to any server.
                </p>

                <div style={{ marginBottom: "8px" }}>
                  <label style={{ fontSize: "9px", letterSpacing: "0.25em", color: "var(--hv-t4)", textTransform: "uppercase", fontFamily: "Georgia, serif", display: "block", marginBottom: "8px" }}>
                    Private Key
                  </label>
                  <textarea
                    value={importKey}
                    onChange={e => { setImportKey(e.target.value); setError(""); }}
                    placeholder="0x... or without 0x prefix"
                    rows={3}
                    style={{
                      width: "100%", background: "var(--hv-surf)",
                      border: `1px solid ${error ? "rgba(255,80,80,0.4)" : "var(--hv-border)"}`,
                      color: "var(--hv-text)", padding: "12px 14px",
                      fontFamily: "monospace", fontSize: "12px",
                      outline: "none", resize: "none", boxSizing: "border-box",
                      letterSpacing: "0.04em",
                    }}
                  />
                </div>

                {error && (
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "10px", color: "rgba(255,80,80,0.8)", marginBottom: "16px", letterSpacing: "0.05em" }}>
                    {error}
                  </p>
                )}

                <div style={{
                  padding: "12px 14px", marginBottom: "24px",
                  background: "var(--hv-bg2)",
                  border: "1px solid var(--hv-border)",
                }}>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "9px", color: "var(--hv-t4)", lineHeight: 1.7, letterSpacing: "0.05em" }}>
                    Your private key is used locally to sign transactions. It is processed in-browser only and never transmitted.
                  </p>
                </div>

                <button
                  onClick={handleImport}
                  disabled={loading || !importKey.trim()}
                  style={{
                    background: loading || !importKey.trim() ? "var(--hv-border)" : "var(--hv-action-bg)",
                    color: loading || !importKey.trim() ? "var(--hv-t4)" : "var(--hv-action-text)",
                    border: "none", padding: "14px 24px", width: "100%",
                    fontFamily: "Georgia, serif", fontSize: "11px",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: loading || !importKey.trim() ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  }}
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ width: "12px", height: "12px", border: "1.5px solid rgba(0,0,0,0.3)", borderTopColor: "var(--hv-action-text)", borderRadius: "50%" }}
                      />
                      Connecting…
                    </>
                  ) : "Connect Wallet →"}
                </button>

                <button onClick={() => setStep("choose")} style={{
                  background: "none", border: "none",
                  color: "var(--hv-t4)", cursor: "pointer",
                  fontFamily: "Georgia, serif", fontSize: "10px",
                  letterSpacing: "0.15em", textTransform: "uppercase",
                  padding: "12px 0 0", display: "block", width: "100%",
                  textAlign: "center",
                }}>← Back</button>
              </motion.div>
            )}

            {/* ── SUCCESS ── */}
            {step === "success" && wallet && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", padding: "12px 0" }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  style={{
                    width: "56px", height: "56px",
                    border: "1px solid var(--hv-border3)",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 24px",
                    fontSize: "22px",
                  }}
                >✓</motion.div>

                <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "18px", color: "var(--hv-text)", marginBottom: "10px", letterSpacing: "0.05em" }}>
                  Access Granted
                </h3>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "var(--hv-t4)", marginBottom: "24px", fontStyle: "italic" }}>
                  Connected to BridgeStone Network
                </p>

                <div style={{
                  background: "var(--hv-surf)",
                  border: "1px solid var(--hv-border)",
                  padding: "12px 16px", marginBottom: "28px",
                }}>
                  <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--hv-t3)", wordBreak: "break-all", letterSpacing: "0.04em" }}>
                    {wallet.address}
                  </p>
                </div>

                <button onClick={onClose} style={{
                  background: "var(--hv-action-bg)", color: "var(--hv-action-text)",
                  border: "none", padding: "14px 40px",
                  fontFamily: "Georgia, serif", fontSize: "11px",
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer",
                }}>
                  Enter Haven →
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/*
═══════════════════════════════════════════════════════════
  BACKEND STUBS tambahkan ke main.py (FastAPI)
═══════════════════════════════════════════════════════════

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/wallet")

class WalletRegisterRequest(BaseModel):
    address: str
    encrypted_keystore: str   # ethers.js JSON keystore (already encrypted)

class WalletLoginRequest(BaseModel):
    address: str

@router.post("/register")
async def register_wallet(req: WalletRegisterRequest):
    # Store encrypted keystore in Redis/DB key is the address
    redis.setex(f"haven:wallet:{req.address}", 365 * 86400, req.encrypted_keystore)
    return {"registered": True, "address": req.address}

@router.post("/login")
async def login_wallet(req: WalletLoginRequest):
    redis.set(f"haven:wallet:last_login:{req.address}", int(time.time()))
    return {"ok": True}

@router.get("/keystore/{address}")
async def get_keystore(address: str):
    # Optional: let user recover their encrypted keystore
    ks = redis.get(f"haven:wallet:{address.lower()}")
    if not ks:
        raise HTTPException(404, "Keystore not found")
    return {"encrypted_keystore": ks}
*/