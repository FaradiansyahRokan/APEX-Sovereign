"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { useSigner } from "@/contexts/SignerContext";
import { ethers } from "ethers";
import NextImage from "next/image";
import { pad } from "viem";
import { BENEVOLENCE_VAULT_ABI } from "../utils/abis";
import { CONTRACTS } from "../utils/constants";
import { ENV } from "../utils/env";

const ORACLE_URL = ENV.ORACLE_URL;
const ORACLE_KEY = ENV.HAVEN_ORACLE_KEY || "HAVEN_ROKAN_NJXBDSA_010011";

type Step = "form" | "uploading" | "oracle" | "onchain" | "success";
type CaptureMode = "camera" | "gallery" | null;

interface Form {
  description: string;
  latitude: number; longitude: number; povertyIndex: number; ipfsCid: string;
  parentEventId: string;
}

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px",
  background: "var(--hv-bg2)",
  border: "1px solid var(--hv-border2)",
  fontFamily: S, fontSize: "13px", color: "var(--hv-t2)",
  outline: "none", boxSizing: "border-box" as const, borderRadius: "0",
  lineHeight: 1.6, transition: "border-color 0.15s",
};

function FieldLabel({ text, note }: { text: string; note?: string }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <p style={{
        fontFamily: S, fontStyle: "italic", fontSize: "11px",
        color: "var(--hv-t4)", letterSpacing: "0.08em",
      }}>{text}</p>
      {note && (
        <p style={{ fontFamily: S, fontSize: "10px", color: "var(--hv-t4)", marginTop: "2px" }}>{note}</p>
      )}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
      <span style={{
        fontFamily: S, fontSize: "9px", fontStyle: "italic",
        color: "var(--hv-t4)", letterSpacing: "0.18em", textTransform: "uppercase",
      }}>{text}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
    </div>
  );
}

// ── Pipeline progress display ─────────────────────────────────────────────────
const STAGES = [
  { key: "uploading", label: "Evidence Preparation", sub: "Hashing · fingerprinting · IPFS CID" },
  { key: "oracle", label: "SATIN Oracle Analysis", sub: "YOLOv8 → Visual Witness → Cross-Exam → Synthesis" },
  { key: "onchain", label: "On-Chain Recording", sub: "Smart contract · zk-proof · token distribution" },
];

function PipelineScreen({ step }: { step: Step }) {
  const idx = STAGES.findIndex(s => s.key === step);
  const current = STAGES[idx] || STAGES[0];

  return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{
        padding: "48px 36px",
        border: "1px solid var(--hv-border2)",
        borderTop: "2px solid var(--hv-rule)",
        background: "var(--hv-bg2)",
      }}>
        {/* Step label */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>Processing</span>
          <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
        </div>

        {/* Spinner minimal ruled animation */}
        <div style={{ marginBottom: "28px", display: "flex", justifyContent: "center" }}>
          <div style={{
            width: "40px", height: "40px",
            border: "1px solid var(--hv-border2)",
            borderTop: "1px solid var(--hv-border-str)",
            borderRadius: "50%",
            animation: "sifSpin 1.2s linear infinite",
          }} />
        </div>

        <h3 style={{
          fontFamily: S, fontWeight: 400, fontSize: "22px",
          color: "var(--hv-text)", textAlign: "center", marginBottom: "8px",
        }}>{current.label}</h3>
        <p style={{
          fontFamily: S, fontStyle: "italic", fontSize: "12px",
          color: "var(--hv-t4)", textAlign: "center",
          lineHeight: 1.7, marginBottom: "32px",
        }}>{current.sub}</p>

        {/* Stage pipeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {STAGES.map((s, i) => {
            const done = i < idx;
            const active = s.key === step;
            return (
              <div key={s.key} style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "12px 0",
                borderBottom: i < STAGES.length - 1 ? "1px solid var(--hv-border)" : "none",
                opacity: done || active ? 1 : 0.3,
              }}>
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                  background: done ? "#fff" : active ? "var(--hv-t2)" : "var(--hv-t4)",
                  animation: active ? "sifDot 1.4s ease-in-out infinite" : "none",
                }} />
                <p style={{
                  fontFamily: S, fontSize: "12px",
                  color: done || active ? "var(--hv-t2)" : "var(--hv-t4)",
                }}>{s.label}</p>
                <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)", marginLeft: "auto" }}>
                  {done ? "Complete" : active ? "Running…" : "Queued"}
                </p>
              </div>
            );
          })}
        </div>

        <p style={{
          fontFamily: S, fontStyle: "italic", fontSize: "10px",
          color: "var(--hv-t4)", textAlign: "center", marginTop: "24px",
        }}>
          Do not close this tab verification is in progress
        </p>
      </div>
      <style>{`
        @keyframes sifSpin { to { transform: rotate(360deg); } }
        @keyframes sifDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.6)} }
      `}</style>
    </div>
  );
}

export default function SubmitImpactForm() {
  const { signer, address: signerAddress } = useSigner();
  const address = signerAddress as string | undefined;
  const publicClient = usePublicClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [txHash, setTxHash] = useState("");
  const [oracle, setOracle] = useState<any>(null);
  const [error, setError] = useState("");
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [captureTimestamp, setCaptureTimestamp] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState<Form>({
    description: "", latitude: 0, longitude: 0, povertyIndex: 0.7, ipfsCid: "", parentEventId: "",
  });

  const busy = step !== "form" && step !== "success";

  const [pendingReview, setPendingReview] = useState(false);
  const [checkingPending, setCheckingPending] = useState(true);

  const checkPendingReview = useCallback(async () => {
    if (!address) { setCheckingPending(false); return; }
    setCheckingPending(true);
    try {
      const res = await fetch(`${ORACLE_URL}/api/v1/stream`, { headers: { "X-HAVEN-Oracle-Key": ORACLE_KEY } });
      const data = await res.json();
      const hasPending = data?.items?.some((item: any) =>
        item.volunteer_address.toLowerCase() === address.toLowerCase() &&
        item.needs_community_review && (!item.vote_info || item.vote_info.outcome === null)
      ) || false;
      setPendingReview(hasPending);
    } catch { }
    finally { setCheckingPending(false); }
  }, [address]);

  useEffect(() => { checkPendingReview(); }, [address, checkPendingReview]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setForm(f => ({ ...f, latitude: p.coords.latitude, longitude: p.coords.longitude })),
      () => { },
      { timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const openCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (fileRef.current) {
        fileRef.current.setAttribute("accept", "image/*");
        fileRef.current.setAttribute("capture", "environment");
        fileRef.current.click();
        setCaptureMode("camera");
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCaptureMode("camera");
      setCameraActive(true);
      setFile(null);
    } catch { setError("Camera access denied. Please allow camera access in browser settings."); }
  };

  const capturePhoto = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    const now = Date.now();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const ts = new Date(now).toISOString();
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    ctx.fillText(`HAVEN:${ts}`, canvas.width - 180, canvas.height - 8);
    setCaptureTimestamp(Math.floor(now / 1000));
    canvas.toBlob(blob => {
      if (!blob) return;
      const f = new File([blob], `capture_${now}.jpg`, { type: "image/jpeg" });
      setFile(f);
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  const selectGallery = () => {
    stopCamera();
    setCaptureMode("gallery");
    if (fileRef.current) {
      fileRef.current.setAttribute("accept", "image/*,video/*");
      fileRef.current.removeAttribute("capture");
      fileRef.current.click();
    }
  };

  const sha256Hex = async (buf: ArrayBuffer): Promise<string> => {
    if (window.crypto && window.crypto.subtle) {
      try {
        const digest = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      } catch { }
    }
    const view = new Uint8Array(buf);
    let h1 = 0x811c9dc5;
    for (let i = 0; i < view.length; i++) { h1 ^= view[i]; h1 = Math.imul(h1, 0x01000193); }
    const hex = (h1 >>> 0).toString(16).padStart(8, "0");
    return hex.repeat(8);
  };

  const resizeImageToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const MAX_DIM = 1024, MAX_KB = 500;
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX_DIM || h > MAX_DIM) { const r = Math.min(MAX_DIM / w, MAX_DIM / h); w = Math.round(w * r); h = Math.round(h * r); }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.82;
      const tryCompress = () => {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        if ((base64.length * 0.75) / 1024 <= MAX_KB || quality < 0.4) { resolve(base64); }
        else { quality -= 0.1; tryCompress(); }
      };
      tryCompress();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    };
    img.src = url;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (Math.abs(form.latitude) < 0.001 && Math.abs(form.longitude) < 0.001) {
      setError("GPS coordinates required. Please press 'Detect' to auto-locate, or enter latitude and longitude manually.");
      return;
    }
    const source = captureMode === "camera" ? "live_capture" : "gallery";
    try {
      setStep("uploading");
      let hash_sha256 = "0".repeat(64), cid = "text-only-submission";
      if (file) { const buf = await file.arrayBuffer(); hash_sha256 = await sha256Hex(buf); cid = `sha256://${hash_sha256}`; }
      setStep("oracle");
      let image_base64: string | null = null;
      if (file) image_base64 = await resizeImageToBase64(file);

      console.debug("[Oracle] Submitting verify request", { address, lat: form.latitude, lng: form.longitude });
      const resp = await fetch(`${ORACLE_URL}/api/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-HAVEN-Oracle-Key": ORACLE_KEY },
        body: JSON.stringify({
          ipfs_cid: cid, evidence_type: file ? "image" : "text", hash_sha256,
          gps: { latitude: form.latitude, longitude: form.longitude, accuracy_meters: 10 },
          volunteer_address: address, beneficiary_address: address,
          description: form.description, image_base64, source,
          capture_timestamp: captureTimestamp ?? null,
          parent_event_id: form.parentEventId || null,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.json();
        console.error("[Oracle] 422/error response:", JSON.stringify(errBody, null, 2));
        // e.detail can be a string (GPS/ban errors) OR an object (AI hard block)
        const detail = errBody.detail;
        if (detail && typeof detail === "object") {
          // AI Cross-Examination rejection — surface the real reason to user
          const reason = detail.reason || detail.error || "Oracle rejected submission";
          const verdict = detail.llm_verdict ? ` — ${detail.llm_verdict}` : "";
          const visual = detail.visual_seen ? `\nAI saw: "${detail.visual_seen}"` : "";
          throw new Error(`${reason}${verdict}${visual}`);
        }
        throw new Error(typeof detail === "string" ? detail : "Oracle failed");
      }
      const real = await resp.json();
      setOracle(real);
      setStep("onchain");

      if (real.needs_community_review) { setTxHash(""); setStep("success"); stopCamera(); return; }

      const ca = real.contract_args;
      if (!address || !CONTRACTS.BENEVOLENCE_VAULT) throw new Error("Wallet not connected");
      if (!signer) throw new Error("No wallet signer available.");
      const contract = new ethers.Contract(
        CONTRACTS.BENEVOLENCE_VAULT,
        BENEVOLENCE_VAULT_ABI,
        signer
      );
      const tx = await contract.releaseReward(
        pad(`0x${real.event_id.replace(/-/g, "")}` as `0x${string}`, { size: 32 }),
        address as `0x${string}`, (ca.beneficiaryAddress ?? address) as `0x${string}`,
        BigInt(ca.impactScoreScaled), BigInt(ca.tokenRewardWei),
        pad(`0x${real.zk_proof_hash.replace("0x", "")}` as `0x${string}`, { size: 32 }),
        pad(`0x${real.event_hash.replace("0x", "")}` as `0x${string}`, { size: 32 }),
        real.nonce, BigInt(real.expires_at), Number(real.signature.v),
        real.signature.r as `0x${string}`, real.signature.s as `0x${string}`,
        { gasLimit: 800000n }
      );
      const hash = tx.hash;
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Transaction reverted by contract.");
      }
      setTxHash(hash); setStep("success"); stopCamera();
    } catch (err: any) {
      setError(err.message || "Transaction failed");
      setStep("form");
      checkPendingReview();
    }
  };

  // ── Pipeline view ─────────────────────────────────────────────────────────
  if (busy) return <PipelineScreen step={step} />;

  // ── Checking view ─────────────────────────────────────────────────────────
  if (checkingPending) return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "14px", color: "var(--hv-t4)" }}>
        Checking submission status…
      </p>
    </div>
  );

  // ── Pending review view ───────────────────────────────────────────────────
  if (pendingReview) return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{
        padding: "40px 32px",
        border: "1px solid var(--hv-border2)",
        borderTop: "2px solid var(--hv-border-str)",
        background: "var(--hv-bg2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>Submission Notice</span>
          <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
        </div>

        <h3 style={{ fontFamily: S, fontWeight: 400, fontSize: "22px", color: "var(--hv-text)", marginBottom: "12px" }}>
          Submission Under Review
        </h3>
        <p style={{
          fontFamily: S, fontStyle: "italic", fontSize: "13px",
          color: "var(--hv-t3)", lineHeight: 1.8,
        }}>
          You have a submission currently pending community review. Please await the outcome
          of the ongoing deliberation and claim your reward if approved before submitting
          a new proof of impact.
        </p>
      </div>
    </div>
  );

  // ── Success view ──────────────────────────────────────────────────────────
  if (step === "success") {
    const isCommunityReview = !txHash;
    return (
      <div style={{ maxWidth: "520px" }}>
        <div style={{
          padding: "40px 36px",
          border: "1px solid var(--hv-border2)",
          borderTop: "2px solid var(--hv-rule)",
          background: "var(--hv-surf)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
            <span style={{
              fontFamily: S, fontSize: "10px", fontStyle: "italic",
              color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
            }}>Submission {isCommunityReview ? "Received" : "Confirmed"}</span>
            <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
          </div>

          <h2 style={{ fontFamily: S, fontWeight: 400, fontSize: "26px", color: "var(--hv-text)", marginBottom: "10px" }}>
            {isCommunityReview ? "Pending Community Review" : "Impact Recorded On-Chain"}
          </h2>
          <p style={{
            fontFamily: S, fontStyle: "italic", fontSize: "13px",
            color: "var(--hv-t4)", lineHeight: 1.8, marginBottom: "24px",
          }}>
            {isCommunityReview
              ? "Your submission has been flagged for community deliberation. You will be able to claim your reward once the vote resolves in your favour."
              : "Your impact proof has been verified, recorded on-chain, and your reward has been distributed."}
          </p>

          {/* Oracle results */}
          {oracle && (
            <div style={{
              borderTop: "1px solid var(--hv-border)",
              borderBottom: "1px solid var(--hv-border)",
              padding: "20px 0", marginBottom: "24px",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
                {[
                  { label: "Impact Score", value: `${oracle.impact_score?.toFixed(1)}/100` },
                  { label: "AI Confidence", value: `${((oracle?.ai_confidence || 0) * 100).toFixed(1)}%` },
                  { label: "STC Earned", value: `${oracle.token_reward?.toFixed(4)}` },
                ].map(s => (
                  <div key={s.label} style={{ borderTop: "1px solid var(--hv-border)", paddingTop: "14px" }}>
                    <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)", marginBottom: "5px" }}>
                      {s.label}
                    </p>
                    <p style={{ fontFamily: M, fontSize: "18px", color: "var(--hv-t2)" }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {oracle.llm_verdict && (
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--hv-border)" }}>
                  <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "var(--hv-t4)" }}>
                    AI Verdict: <em style={{ color: "var(--hv-t3)" }}>{oracle.llm_verdict}</em>
                  </p>
                  {oracle.visual_description && (
                    <p style={{
                      fontFamily: S, fontStyle: "italic", fontSize: "11px",
                      color: "var(--hv-t4)", lineHeight: 1.7, marginTop: "8px",
                    }}>
                      &quot;{oracle.visual_description}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {txHash && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)", marginBottom: "5px" }}>
                Transaction Hash
              </p>
              <p style={{ fontFamily: M, fontSize: "11px", color: "var(--hv-t3)", wordBreak: "break-all" }}>
                {txHash}
              </p>
            </div>
          )}

          <button onClick={() => { setStep("form"); setOracle(null); setTxHash(""); setFile(null); setCaptureMode(null); checkPendingReview(); }}
            style={{
              width: "100%", padding: "13px",
              background: "var(--hv-action-bg)", border: "none", color: "var(--hv-action-text)",
              fontFamily: S, fontSize: "11px", letterSpacing: "0.18em",
              textTransform: "uppercase", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            Submit Another Proof
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "620px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Impact Verification</span>
          <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
        </div>
        <h2 style={{ fontFamily: S, fontWeight: 400, fontSize: "30px", color: "var(--hv-text)", marginBottom: "6px" }}>
          Submit Proof of Impact
        </h2>
        <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "13px", color: "var(--hv-t4)" }}>
          All submissions are cross-examined by the SATIN AI oracle before on-chain recording
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Project chain */}
        <div style={{ padding: "24px", border: "1px solid var(--hv-border)", background: "var(--hv-bg2)" }}>
          <SectionLabel text="Cross-Temporal Link (Optional)" />
          <FieldLabel text="Parent Event ID" note="Link to a prior submission to earn Project Chain Bonus (up to +30%)" />
          <input
            type="text"
            placeholder="Leave blank for a new project"
            value={form.parentEventId}
            onChange={e => setForm(f => ({ ...f, parentEventId: e.target.value }))}
            style={{ ...fieldStyle, fontFamily: M, fontSize: "12px" }}
            onFocus={e => { e.target.style.borderColor = "var(--hv-border-str)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--hv-border3)"; }}
          />
        </div>

        {/* Description */}
        <div style={{ padding: "24px", border: "1px solid var(--hv-border)", background: "var(--hv-bg2)" }}>
          <SectionLabel text="Impact Description" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
            <FieldLabel text="Describe your impact" />
            <span style={{ fontFamily: M, fontSize: "9px", color: "var(--hv-t4)", marginBottom: "8px" }}>
              {form.description.length} chars
            </span>
          </div>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4} required
            placeholder="Describe precisely what you observed and accomplished. The AI will cross-examine your account against the photographic evidence…"
            style={{ ...fieldStyle, resize: "none", lineHeight: 1.75 }}
            onFocus={e => { e.target.style.borderColor = "var(--hv-border-str)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--hv-border3)"; }}
          />
          <div style={{
            marginTop: "10px", padding: "12px 14px",
            border: "1px solid var(--hv-border)",
            background: "var(--hv-bg2)",
          }}>
            <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "11px", color: "var(--hv-t4)", lineHeight: 1.7 }}>
              The AI will first examine your photograph independently, then cross-reference it with your stated account.
              Accurate descriptions yield higher claim accuracy scores.
            </p>
          </div>
        </div>

        {/* GPS */}
        <div style={{ padding: "24px", border: "1px solid var(--hv-border)", background: "var(--hv-bg2)" }}>
          <SectionLabel text="Location" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <FieldLabel text="GPS Coordinates" />
            <span style={{
              fontFamily: S, fontStyle: "italic", fontSize: "9px", letterSpacing: "0.1em",
              color: (Math.abs(form.latitude) > 0.001 || Math.abs(form.longitude) > 0.001) ? "var(--hv-t2)" : "var(--hv-t5)",
              textTransform: "uppercase",
            }}>
              {(Math.abs(form.latitude) > 0.001 || Math.abs(form.longitude) > 0.001) ? "Located" : "Required"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { ph: "Latitude", key: "latitude", val: form.latitude },
              { ph: "Longitude", key: "longitude", val: form.longitude },
            ].map(inp => (
              <input key={inp.key} type="number" placeholder={inp.ph} step="any"
                value={inp.val || ""}
                onChange={e => setForm(f => ({ ...f, [inp.key]: Number(e.target.value) }))}
                style={{ ...fieldStyle, flex: 1, fontFamily: M, fontSize: "12px" }}
                onFocus={e => { e.target.style.borderColor = "var(--hv-border-str)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--hv-border3)"; }}
              />
            ))}
            <button type="button"
              onClick={() => navigator.geolocation.getCurrentPosition(
                p => setForm(f => ({ ...f, latitude: p.coords.latitude, longitude: p.coords.longitude })),
                () => setError("Could not retrieve location. Enter coordinates manually.")
              )}
              style={{
                padding: "13px 18px", flexShrink: 0,
                background: "transparent", border: "1px solid var(--hv-border2)",
                color: "var(--hv-t3)",
                fontFamily: S, fontStyle: "italic", fontSize: "11px",
                cursor: "pointer", whiteSpace: "nowrap" as const,
                transition: "all 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--hv-surf)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Detect
            </button>
          </div>
        </div>

        {/* Evidence */}
        <div style={{ border: "1px solid var(--hv-border)", background: "var(--hv-bg2)" }}>
          <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid var(--hv-border)" }}>
            <SectionLabel text="Evidence Photograph" />
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={openCamera} disabled={busy} style={{
                flex: 1, padding: "12px",
                background: captureMode === "camera" ? "var(--hv-surf2)" : "transparent",
                border: captureMode === "camera" ? "1px solid var(--hv-border3)" : "1px solid var(--hv-border2)",
                color: captureMode === "camera" ? "var(--hv-t2)" : "var(--hv-t3)",
                fontFamily: S, fontStyle: "italic", fontSize: "11px",
                cursor: "pointer", transition: "all 0.12s",
                letterSpacing: "0.06em",
              }}>
                Live Camera
                <span style={{ display: "block", fontSize: "9px", marginTop: "2px", color: "var(--hv-t4)" }}>
                  Authenticity bonus
                </span>
              </button>
              <button type="button" onClick={selectGallery} disabled={busy} style={{
                flex: 1, padding: "12px",
                background: captureMode === "gallery" ? "var(--hv-surf2)" : "transparent",
                border: captureMode === "gallery" ? "1px solid var(--hv-border3)" : "1px solid var(--hv-border2)",
                color: captureMode === "gallery" ? "var(--hv-t2)" : "var(--hv-t3)",
                fontFamily: S, fontStyle: "italic", fontSize: "11px",
                cursor: "pointer", transition: "all 0.12s",
                letterSpacing: "0.06em",
              }}>
                Upload from Gallery
              </button>
            </div>
          </div>

          {/* Camera view */}
          {cameraActive && (
            <div style={{ padding: "20px 24px" }}>
              <video ref={videoRef} autoPlay muted playsInline style={{
                width: "100%", maxHeight: "280px", objectFit: "cover",
                display: "block", border: "1px solid var(--hv-border)",
              }} />
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="button" onClick={capturePhoto} style={{
                  flex: 2, padding: "12px",
                  background: "var(--hv-action-bg)", border: "none", color: "var(--hv-action-text)",
                  fontFamily: S, fontSize: "11px", letterSpacing: "0.15em",
                  textTransform: "uppercase", cursor: "pointer",
                }}>Capture</button>
                <button type="button" onClick={stopCamera} style={{
                  flex: 1, padding: "12px", background: "transparent",
                  border: "1px solid var(--hv-border2)", color: "var(--hv-t4)",
                  fontFamily: S, fontStyle: "italic", fontSize: "11px", cursor: "pointer",
                }}>Cancel</button>
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
          )}

          {/* Preview */}
          {previewUrl && !cameraActive && (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <NextImage src={previewUrl} alt="Evidence preview"
                  width={500}
                  height={200}
                  unoptimized
                  style={{
                    maxWidth: "100%", maxHeight: "200px", objectFit: "cover",
                    display: "block", border: "1px solid var(--hv-border)",
                  }}
                />
                <button onClick={() => { setFile(null); setCaptureMode(null); }} style={{
                  position: "absolute", top: "8px", right: "8px",
                  width: "28px", height: "28px",
                  background: "rgba(0,0,0,0.7)", border: "1px solid var(--hv-border2)",
                  color: "var(--hv-t2)", fontSize: "12px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}>✕</button>
              </div>
              {captureMode === "camera" && captureTimestamp && (
                <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)", marginTop: "8px" }}>
                  Live capture · {new Date(captureTimestamp * 1000).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" style={{ display: "none" }} accept="image/*"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
        </div>

        {/* Terms */}
        <div style={{ padding: "16px 20px", border: "1px solid var(--hv-border)", background: "var(--hv-bg2)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
            <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
              style={{ marginTop: "2px", accentColor: "var(--hv-action-bg)" }} />
            <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "12px", color: "var(--hv-t3)", lineHeight: 1.7 }}>
              I attest that this submission is an accurate and honest account of a real humanitarian impact event.
              I understand that false submissions are subject to community rejection and reputational penalties.
            </p>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "14px 16px", border: "1px solid var(--hv-border2)", background: "var(--hv-bg2)" }}>
            <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "10px", color: "var(--hv-t4)", letterSpacing: "0.12em", marginBottom: "6px", textTransform: "uppercase" }}>
              Submission Rejected
            </p>
            <p style={{ fontFamily: S, fontSize: "12px", color: "var(--hv-t3)", lineHeight: 1.7, whiteSpace: "pre-line" as const }}>
              {error}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={e => handleSubmit(e as any)}
          disabled={busy || !termsAccepted}
          style={{
            padding: "16px 32px",
            background: (busy || !termsAccepted) ? "var(--hv-surf2)" : "var(--hv-action-bg)",
            border: "none",
            color: (busy || !termsAccepted) ? "var(--hv-t4)" : "var(--hv-action-text)",
            fontFamily: S, fontSize: "12px", letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: (busy || !termsAccepted) ? "not-allowed" : "pointer",
            transition: "all 0.15s", width: "100%",
          }}
          onMouseEnter={e => { if (!busy && termsAccepted) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          Submit Proof of Impact
        </button>
      </div>
    </div>
  );
}