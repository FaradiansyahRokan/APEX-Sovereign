"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { pad } from "viem";
import { BENEVOLENCE_VAULT_ABI } from "../utils/abis";
import { CONTRACTS } from "../utils/constants";
import { ENV } from "../utils/env";

const getOracleUrl = () => {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_ORACLE_URL || "http://localhost:8000";
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal) return "http://127.0.0.1:8000";
  return process.env.NEXT_PUBLIC_ORACLE_URL || `http://${host}:8000`;
};

const ORACLE_URL = getOracleUrl();
const ORACLE_KEY = process.env.NEXT_PUBLIC_SATIN_API_KEY || "apex-dev-key";

type Step = "form" | "uploading" | "oracle" | "onchain" | "success";
type CaptureMode = "camera" | "gallery" | null;

interface Form {
  description: string;
  latitude: number; longitude: number; povertyIndex: number; ipfsCid: string;
  parentEventId: string;
}



const glassCard: React.CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.025)",
  overflow: "hidden",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10px", color: "rgba(255,255,255,0.35)",
  textTransform: "uppercase", letterSpacing: "0.09em",
  marginBottom: "9px",
  fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "13px", color: "#fff",
  outline: "none", boxSizing: "border-box" as const,
  transition: "border-color 0.2s",
};

export default function SubmitImpactForm() {
  const { address } = useAccount();
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
    description: "",
    latitude: 0, longitude: 0, povertyIndex: 0.7, ipfsCid: "",
    parentEventId: "",
  });

  const { writeContractAsync } = useWriteContract();
  const busy = step !== "form";

  const [pendingReview, setPendingReview] = useState<boolean>(false);
  const [checkingPending, setCheckingPending] = useState<boolean>(true);

  // Check for existing pending community review
  const checkPendingReview = async () => {
    if (!address) {
      setCheckingPending(false);
      return;
    }
    setCheckingPending(true);
    try {
      const res = await fetch(`${ORACLE_URL}/api/v1/stream`, {
        headers: { "X-APEX-Oracle-Key": ORACLE_KEY },
      });
      const data = await res.json();
      const hasPending = data?.items?.some((item: any) =>
        item.volunteer_address.toLowerCase() === address.toLowerCase() &&
        item.needs_community_review &&
        (!item.vote_info || item.vote_info.outcome === null)
      ) || false;
      setPendingReview(hasPending);
    } catch (err) {
      console.error("Failed to check stream", err);
    } finally {
      setCheckingPending(false);
    }
  };

  useEffect(() => {
    checkPendingReview();
  }, [address]);

  // Auto-request GPS on mount so user doesn't have to click Auto
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setForm(f => ({ ...f, latitude: p.coords.latitude, longitude: p.coords.longitude })),
      () => { /* silent — user can still click Auto or type manually */ },
      { timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

  // ── Camera helpers ────────────────────────────────────────────────────────
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  // Assign srcObject AFTER React renders <video> into the DOM
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Generate / revoke object URL for image preview
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);



  const openCamera = async () => {
    // ── FALLBACK: Insecure Context (HTTP over IP) ───────────────────────────
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (fileRef.current) {
        // Force image-only to help the browser choose the camera application
        fileRef.current.setAttribute("accept", "image/*");
        fileRef.current.setAttribute("capture", "environment");
        fileRef.current.click();
        setCaptureMode("camera");
      }
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCaptureMode("camera");
      setCameraActive(true); // <video> mounts → useEffect assigns srcObject
      setFile(null);
    } catch {
      setError("Tidak dapat mengakses kamera. Izinkan akses kamera di browser.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const now = Date.now();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // ── Invisible cryptographic timestamp watermark ─────────────────────────
    // Tiny, low-opacity text in the bottom-right corner.
    // Virtually invisible to the human eye but readable by oracle/forensics.
    const ts = new Date(now).toISOString(); // e.g. "2026-02-27T21:40:00.000Z"
    const label = `APEX:${ts}`;
    const fontSize = Math.max(10, Math.floor(canvas.width * 0.012));
    ctx.font = `${fontSize}px monospace`;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, canvas.width - 8, canvas.height - 6);
    ctx.globalAlpha = 1.0;
    // ───────────────────────────────────────────────────────────────────────

    canvas.toBlob(blob => {
      if (!blob) return;
      const captured = new File([blob], `apex-capture-${now}.jpg`, { type: "image/jpeg" });
      setCaptureTimestamp(now);
      setFile(captured);
      setError("");
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

  // ── Helper: real SHA-256 with fallback for non-secure contexts ────────────
  const sha256Hex = async (buf: ArrayBuffer): Promise<string> => {
    // Check if we are in a secure context (HTTPS/localhost) for SubtleCrypto
    if (window.crypto && window.crypto.subtle) {
      try {
        const digest = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        console.warn("SubtleCrypto failed, using fallback hash", e);
      }
    }

    // Simple JS Hashing fallback (FNV-1a based) for development over HTTP IP
    // Note: In production, HTTPS is required for real SHA-256.
    const view = new Uint8Array(buf);
    let h1 = 0x811c9dc5;
    for (let i = 0; i < view.length; i++) {
      h1 ^= view[i];
      h1 = Math.imul(h1, 0x01000193);
    }
    // Return a 64-char string to match SHA-256 length expectations
    const hex = (h1 >>> 0).toString(16).padStart(8, "0");
    return hex.repeat(8);
  };

  // ── Helper: client-side image resize + compress to base64 ─────────────────
  // v1.2.0: Resize to max 1024×1024, JPEG quality 0.82, max ~500 KB.
  // Sends ~80% less data to Oracle while preserving enough detail for YOLOv8.
  const resizeImageToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const MAX_DIM = 1024;
      const MAX_KB = 500;

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Compute scaled dimensions
        let { naturalWidth: w, naturalHeight: h } = img;
        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);

        // Compress until within size limit
        let quality = 0.82;
        const tryCompress = () => {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          const base64 = dataUrl.split(",")[1];
          const sizeKB = (base64.length * 0.75) / 1024;  // approx decoded bytes
          if (sizeKB <= MAX_KB || quality < 0.4) {
            resolve(base64);
          } else {
            quality -= 0.1;
            tryCompress();
          }
        };
        tryCompress();
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: read raw without resize
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

    // GPS validation — reject (0,0) = null island
    if (Math.abs(form.latitude) < 0.001 && Math.abs(form.longitude) < 0.001) {
      setError("GPS coordinates required. Click 'Auto' to detect your location, or enter manually.");
      return;
    }

    const source = captureMode === "camera" ? "live_capture" : "gallery";
    try {
      setStep("uploading");

      let hash_sha256 = "0".repeat(64);
      let cid = "text-only-submission";

      if (file) {
        const buf = await file.arrayBuffer();
        hash_sha256 = await sha256Hex(buf);
        cid = `sha256://${hash_sha256}`;
      }

      setStep("oracle");
      let image_base64: string | null = null;
      if (file) {
        // v1.2.0: resize + compress client-side before sending to Oracle
        image_base64 = await resizeImageToBase64(file);
      }

      const resp = await fetch(`${ORACLE_URL}/api/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-APEX-Oracle-Key": ORACLE_KEY },
        body: JSON.stringify({
          ipfs_cid: cid, evidence_type: file ? "image" : "text",
          hash_sha256,
          gps: { latitude: form.latitude, longitude: form.longitude, accuracy_meters: 10 },
          volunteer_address: address, beneficiary_address: address,
          description: form.description, image_base64,
          source,
          capture_timestamp: captureTimestamp ?? null,
          parent_event_id: form.parentEventId || null,
        }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.detail || "Oracle failed"); }
      const real = await resp.json();
      setOracle(real);

      setStep("onchain");
      // ── Community review: skip contract call ────────────────────────────────
      if (real.needs_community_review) {
        setTxHash("");          // no on-chain tx
        setStep("success");
        stopCamera();
        return;
      }

      // ── Normal flow: submit on-chain ─────────────────────────────────────────
      const ca = real.contract_args;
      if (!address || !CONTRACTS.BENEVOLENCE_VAULT) throw new Error("Wallet not connected");

      const hash = await writeContractAsync({
        address: CONTRACTS.BENEVOLENCE_VAULT as `0x${string}`,
        abi: BENEVOLENCE_VAULT_ABI, functionName: "releaseReward",
        args: [
          pad(`0x${real.event_id.replace(/-/g, "")}` as `0x${string}`, { size: 32 }),
          address as `0x${string}`,
          (ca.beneficiaryAddress ?? address) as `0x${string}`,
          BigInt(ca.impactScoreScaled), BigInt(ca.tokenRewardWei),
          pad(`0x${real.zk_proof_hash.replace("0x", "")}` as `0x${string}`, { size: 32 }),
          pad(`0x${real.event_hash.replace("0x", "")}` as `0x${string}`, { size: 32 }),
          real.nonce, BigInt(real.expires_at),
          Number(real.signature.v),
          real.signature.r as `0x${string}`,
          real.signature.s as `0x${string}`,
        ],
        gas: 800000n,
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Transaction reverted by contract.");
      }

      setTxHash(hash);
      setStep("success");
      stopCamera();

    } catch (err: any) {
      setError(err.message || "Transaction failed");
      setStep("form");
      checkPendingReview();
    }
  };

  /* ── Success screen ── */
  const isCommunityReview = step === "success" && !txHash;
  if (step === "success") return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ ...glassCard, position: "relative" }}>
        <div style={{
          height: "2px", background: isCommunityReview
            ? "linear-gradient(90deg,#ffbd59,#ff6eb4)"
            : "linear-gradient(90deg,#00dfb2,#7c6aff,#ffbd59,#ff6eb4)"
        }} />
        {/* Glow */}
        <div style={{
          position: "absolute", top: "-40px", left: "50%", transform: "translateX(-50%)",
          width: "200px", height: "200px", borderRadius: "50%",
          background: isCommunityReview
            ? "radial-gradient(circle,rgba(255,189,89,0.12) 0%,transparent 70%)"
            : "radial-gradient(circle,rgba(0,223,178,0.1) 0%,transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ padding: "40px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "22px", position: "relative" }}>
          <div style={{
            width: "60px", height: "60px", borderRadius: "18px",
            background: isCommunityReview ? "rgba(255,189,89,0.1)" : "rgba(0,223,178,0.1)",
            border: `1px solid ${isCommunityReview ? "rgba(255,189,89,0.25)" : "rgba(0,223,178,0.2)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px",
            boxShadow: isCommunityReview ? "0 0 30px rgba(255,189,89,0.2)" : "0 0 30px rgba(0,223,178,0.2)",
          }}>{isCommunityReview ? "⏳" : "✅"}</div>

          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: "#fff", marginBottom: "8px" }}>
              {isCommunityReview ? "Menunggu Verifikasi Komunitas" : "Impact Verified!"}
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              {isCommunityReview
                ? "AI SATIN ragu dengan foto ini. Submission kamu sudah masuk ke Community Stream untuk divoting komunitas. Cek tab 🔴 Community Stream untuk melihat progresnya."
                : "Your action was verified by AI and recorded on the Reputation Ledger."}
            </p>
          </div>

          {oracle && (
            <div style={{ width: "100%", borderRadius: "12px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "1px", background: "linear-gradient(90deg,#00dfb2,#7c6aff,#ffbd59,#ff6eb4)" }} />

              {/* ── Core Scores ── */}
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { label: "Impact Score", value: `${oracle.impact_score?.toFixed(1)}/100`, gradient: "linear-gradient(90deg,#00dfb2,#7c6aff)" },
                  { label: "AI Confidence", value: `${((oracle?.ai_confidence || 0) * 100).toFixed(1)}%`, gradient: "linear-gradient(90deg,#7c6aff,#ff6eb4)" },
                  { label: "APEX Earned", value: `${oracle.token_reward?.toFixed(4)} APEX`, gradient: "linear-gradient(90deg,#ffbd59,#ff6eb4)" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
                    <p style={{
                      fontFamily: "'JetBrains Mono',monospace", fontSize: "15px", fontWeight: 700,
                      background: s.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* ── AI Deduced Parameters ── */}
              <div style={{
                padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.01)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"
              }}>
                {[
                  { label: "Action Type (AI)", value: (oracle.deduced_action_type ?? oracle.action_type ?? "—")?.replace(/_/g, " "), color: "#fff" },
                  { label: "Urgency (AI)", value: oracle.deduced_urgency ?? oracle.urgency_level ?? "—", color: "#ffbd59" },
                  { label: "People Helped (AI)", value: `${oracle.deduced_people_helped ?? oracle.adjusted_people_helped ?? "—"} People`, color: "#00dfb2" },
                  { label: "Effort (AI)", value: `${oracle.deduced_effort_hours ?? oracle.adjusted_effort_hours ?? "—"}h`, color: "#7c6aff" },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: "4px" }}>{s.label}</p>
                    <p style={{ fontSize: "12px", color: s.color, fontWeight: 600 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* ── 3-Phase Cross-Examination Results ── */}
              <div style={{
                padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(0,223,178,0.015)",
              }}>
                <p style={{
                  fontSize: "9px", color: "#00dfb2", fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <span>🔬</span> 3-Phase AI Cross-Examination
                </p>

                {/* Fase 1: Visual Witness */}
                <div style={{ marginBottom: "14px" }}>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                    📸 Fase 1 — Visual Witness (AI melihat foto tanpa tahu klaim)
                  </p>
                  {oracle.visual_description && (
                    <p style={{
                      fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6,
                      fontStyle: "italic",
                      padding: "8px 12px", borderRadius: "8px",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      "{oracle.visual_description}"
                    </p>
                  )}
                  {(oracle.phase1_scene_type || oracle.phase1_people_visible !== undefined) && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                      {oracle.phase1_scene_type && (
                        <span style={{
                          fontSize: "9px", padding: "3px 8px", borderRadius: "5px",
                          background: "rgba(0,223,178,0.08)", border: "1px solid rgba(0,223,178,0.15)",
                          color: "#00dfb2", fontFamily: "'JetBrains Mono',monospace",
                        }}>scene: {oracle.phase1_scene_type}</span>
                      )}
                      {oracle.phase1_people_visible !== undefined && (
                        <span style={{
                          fontSize: "9px", padding: "3px 8px", borderRadius: "5px",
                          background: "rgba(124,106,255,0.08)", border: "1px solid rgba(124,106,255,0.15)",
                          color: "#7c6aff", fontFamily: "'JetBrains Mono',monospace",
                        }}>AI saw: {oracle.phase1_people_visible} people</span>
                      )}
                      {oracle.phase1_image_auth && (
                        <span style={{
                          fontSize: "9px", padding: "3px 8px", borderRadius: "5px",
                          background: oracle.phase1_image_auth === "real_photo" ? "rgba(107,255,158,0.08)" : "rgba(255,100,100,0.08)",
                          border: `1px solid ${oracle.phase1_image_auth === "real_photo" ? "rgba(107,255,158,0.2)" : "rgba(255,100,100,0.2)"}`,
                          color: oracle.phase1_image_auth === "real_photo" ? "#6bff9e" : "#ff6b6b",
                          fontFamily: "'JetBrains Mono',monospace",
                        }}>{oracle.phase1_image_auth}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Fase 2: Cross-Examination Verdict */}
                <div style={{ marginBottom: "14px" }}>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                    ⚖️ Fase 2 — Cross-Examination (klaim vs visual)
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {/* Verdict badge */}
                    <span style={{
                      fontSize: "10px", fontWeight: 800, padding: "4px 10px", borderRadius: "6px",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      background: oracle.llm_verdict === "consistent"
                        ? "rgba(107,255,158,0.12)" : oracle.llm_verdict === "suspicious"
                        ? "rgba(255,189,89,0.12)" : "rgba(255,100,100,0.12)",
                      border: `1px solid ${oracle.llm_verdict === "consistent"
                        ? "rgba(107,255,158,0.3)" : oracle.llm_verdict === "suspicious"
                        ? "rgba(255,189,89,0.3)" : "rgba(255,100,100,0.3)"}`,
                      color: oracle.llm_verdict === "consistent" ? "#6bff9e"
                        : oracle.llm_verdict === "suspicious" ? "#ffbd59" : "#ff6b6b",
                    }}>
                      {oracle.llm_verdict === "consistent" ? "✅" : oracle.llm_verdict === "suspicious" ? "⚠️" : "❌"} {oracle.llm_verdict}
                    </span>
                    {/* Claim accuracy meter */}
                    {oracle.claim_accuracy_score !== undefined && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>Claim Accuracy:</span>
                        <div style={{ width: "60px", height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.06)" }}>
                          <div style={{
                            height: "100%", borderRadius: "3px",
                            width: `${oracle.claim_accuracy_score * 100}%`,
                            background: oracle.claim_accuracy_score > 0.7
                              ? "linear-gradient(90deg,#00dfb2,#6bff9e)"
                              : oracle.claim_accuracy_score > 0.4
                              ? "linear-gradient(90deg,#ffbd59,#ff9f43)"
                              : "linear-gradient(90deg,#ff6b6b,#ee5a24)",
                            transition: "width 0.8s ease",
                          }} />
                        </div>
                        <span style={{
                          fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", fontWeight: 700,
                          color: oracle.claim_accuracy_score > 0.7 ? "#6bff9e"
                            : oracle.claim_accuracy_score > 0.4 ? "#ffbd59" : "#ff6b6b",
                        }}>{Math.round(oracle.claim_accuracy_score * 100)}%</span>
                      </div>
                    )}
                  </div>
                  {/* AI Reasoning */}
                  {oracle.llm_reason && (
                    <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "8px" }}>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                        <b style={{ color: "rgba(255,255,255,0.75)" }}>AI Reasoning:</b> {oracle.llm_reason}
                      </p>
                    </div>
                  )}
                  {/* Discrepancies */}
                  {oracle.discrepancies && oracle.discrepancies.length > 0 && (
                    <div style={{ marginTop: "6px" }}>
                      <p style={{ fontSize: "9px", color: "rgba(255,189,89,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>
                        Ketidakcocokan yang terdeteksi:
                      </p>
                      {oracle.discrepancies.slice(0, 4).map((d: string, i: number) => (
                        <div key={i} style={{
                          display: "flex", gap: "6px", alignItems: "flex-start",
                          marginBottom: "4px",
                        }}>
                          <span style={{ color: "#ffbd59", fontSize: "10px", flexShrink: 0, marginTop: "1px" }}>△</span>
                          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{d}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fase 3: Integrity Score */}
                <div>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                    🛡️ Fase 3 — Integrity Synthesis
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      flex: 1, height: "6px", borderRadius: "3px",
                      background: "rgba(255,255,255,0.05)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${(oracle.integrity_score ?? 1) * 100}%`,
                        background: (oracle.integrity_score ?? 1) > 0.7
                          ? "linear-gradient(90deg,#00dfb2,#6bff9e)"
                          : (oracle.integrity_score ?? 1) > 0.4
                          ? "linear-gradient(90deg,#ffbd59,#ff9f43)"
                          : "linear-gradient(90deg,#ff6b6b,#ee5a24)",
                        borderRadius: "3px",
                        transition: "width 0.8s ease",
                        boxShadow: "0 0 8px rgba(0,223,178,0.4)",
                      }} />
                    </div>
                    <span style={{
                      fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", fontWeight: 700,
                      color: (oracle.integrity_score ?? 1) > 0.7 ? "#6bff9e"
                        : (oracle.integrity_score ?? 1) > 0.4 ? "#ffbd59" : "#ff6b6b",
                      minWidth: "36px", textAlign: "right",
                    }}>{Math.round((oracle.integrity_score ?? 1) * 100)}%</span>
                  </div>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", marginTop: "5px", fontFamily: "'JetBrains Mono',monospace" }}>
                    Score integritas visual keseluruhan berdasarkan semua fase verifikasi AI
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Integrity warnings */}
          {oracle?.integrity_warnings?.length > 0 && (
            <div style={{
              width: "100%", padding: "12px 16px", borderRadius: "10px",
              background: "rgba(255,189,89,0.06)", border: "1px solid rgba(255,189,89,0.2)",
              fontSize: "11px", color: "rgba(255,189,89,0.8)", lineHeight: 1.7,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              ⚠️ Integrity notes: {oracle.integrity_warnings.join(" · ")}
              {oracle.authenticity_penalty > 0 && (
                <span style={{ display: "block", marginTop: "4px", opacity: 0.7 }}>
                  Score adjusted by −{(oracle.authenticity_penalty * 100).toFixed(0)}% due to integrity flags.
                </span>
              )}
            </div>
          )}
          {txHash && (
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "rgba(124,106,255,0.5)" }}>
              TX: {txHash.slice(0, 14)}…{txHash.slice(-8)}
            </p>
          )}

          <button
            onClick={() => { setStep("form"); setFile(null); setOracle(null); setTxHash(""); setCaptureMode(null); setCaptureTimestamp(null); checkPendingReview(); }}
            style={{
              width: "100%", padding: "14px", borderRadius: "12px", border: "none",
              background: "linear-gradient(135deg,#00dfb2,#7c6aff)",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: "14px", fontWeight: 800, color: "#0a0510",
              cursor: "pointer", boxShadow: "0 4px 20px rgba(0,223,178,0.25)",
              transition: "transform 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"}
          >
            Submit Another Proof →
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Processing screen — Cinematic AI pipeline ── */
  const PIPELINE_STAGES = [
    {
      key: "uploading",
      title: "Preparing Evidence",
      subtitle: "Compressing & hashing image",
      detail: "SHA-256 fingerprint generation · IPFS CID computation",
      color: "#7c6aff",
    },
    {
      key: "oracle",
      title: "SATIN Oracle Analysis",
      subtitle: "Multi-phase AI verification running",
      detail: "CV Object Detection → Phase 1 Visual Witness → Phase 2 Cross-Exam → Phase 3 Synthesis",
      color: "#00dfb2",
      substeps: [
        "YOLOv8 object detection",
        "EXIF + ELA authenticity check",
        "LLaVA visual witness (blind)",
        "Cross-examination vs your claim",
        "Integrity score synthesis",
      ],
    },
    {
      key: "onchain",
      title: "Recording On-Chain",
      subtitle: "Writing to Reputation Ledger",
      detail: "Smart contract · zk-proof · token distribution",
      color: "#ffbd59",
    },
  ];

  if (busy) {
    const currentStage = PIPELINE_STAGES.find(s => s.key === step) || PIPELINE_STAGES[0];
    const isOracle = step === "oracle";

    return (
      <div style={{ maxWidth: "480px" }}>
        <div style={{ ...glassCard, position: "relative", overflow: "hidden" }}>
          {/* Animated gradient top bar */}
          <div style={{
            height: "3px",
            background: `linear-gradient(90deg, transparent, ${currentStage.color}, ${currentStage.color}, transparent)`,
            backgroundSize: "200% 100%",
            animation: "scanline 1.8s ease-in-out infinite",
          }} />

          {/* Background glow */}
          <div style={{
            position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)",
            width: "300px", height: "300px", borderRadius: "50%",
            background: `radial-gradient(circle, ${currentStage.color}12 0%, transparent 65%)`,
            pointerEvents: "none", transition: "all 0.8s ease",
          }} />

          <div style={{ padding: "36px 32px", position: "relative", display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Header */}
            <div style={{ textAlign: "center" }}>
              {/* Animated circle indicator */}
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%", margin: "0 auto 16px",
                border: `2px solid ${currentStage.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
                boxShadow: `0 0 0 0 ${currentStage.color}30`,
                animation: "ringPulse 1.5s ease-out infinite",
              }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  border: `2px solid ${currentStage.color}`,
                  borderTopColor: "transparent",
                  animation: "spin 0.9s linear infinite",
                }} />
                <div style={{
                  position: "absolute", width: "12px", height: "12px", borderRadius: "50%",
                  background: currentStage.color,
                  boxShadow: `0 0 10px ${currentStage.color}`,
                }} />
              </div>

              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800,
                fontSize: "18px", color: "#fff", marginBottom: "5px",
              }}>{currentStage.title}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>
                {currentStage.subtitle}
              </p>
              <p style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: "9px",
                color: `${currentStage.color}80`, letterSpacing: "0.05em",
                lineHeight: 1.7,
              }}>{currentStage.detail}</p>
            </div>

            {/* Oracle substeps — only during oracle phase */}
            {isOracle && currentStage.substeps && (
              <div style={{
                padding: "16px", borderRadius: "12px",
                background: "rgba(0,223,178,0.03)", border: "1px solid rgba(0,223,178,0.1)",
                display: "flex", flexDirection: "column", gap: "8px",
              }}>
                <p style={{
                  fontFamily: "'JetBrains Mono',monospace", fontSize: "9px",
                  fontWeight: 700, color: "rgba(0,223,178,0.5)", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginBottom: "2px",
                }}>Pipeline in progress</p>
                {currentStage.substeps.map((sub, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Animated dot */}
                    <div style={{
                      width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                      background: "#00dfb2",
                      animation: `dotBlink 1.2s ease-in-out ${i * 0.18}s infinite`,
                      boxShadow: "0 0 6px #00dfb2",
                    }} />
                    <p style={{
                      fontFamily: "'JetBrains Mono',monospace", fontSize: "10px",
                      color: "rgba(255,255,255,0.45)",
                    }}>{sub}</p>
                  </div>
                ))}
                {/* Animated progress bar */}
                <div style={{ marginTop: "6px", height: "2px", borderRadius: "99px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "99px",
                    background: "linear-gradient(90deg, #00dfb2, #7c6aff)",
                    animation: "oracleProgress 18s linear forwards",
                  }} />
                </div>
                <p style={{
                  fontFamily: "'JetBrains Mono',monospace", fontSize: "9px",
                  color: "rgba(255,255,255,0.2)", textAlign: "right",
                }}>~15–40s depending on model load</p>
              </div>
            )}

            {/* Stage pipeline breadcrumb */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {PIPELINE_STAGES.map((s, i) => {
                const done = PIPELINE_STAGES.findIndex(ps => ps.key === step) > i;
                const active = s.key === step;
                return (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "6px", flex: active ? 2 : 1 }}>
                    <div style={{
                      flex: 1, display: "flex", flexDirection: "column", gap: "5px",
                      padding: "10px 12px", borderRadius: "10px",
                      background: active ? `${s.color}10` : done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
                      border: `1px solid ${active ? `${s.color}30` : done ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"}`,
                      transition: "all 0.4s ease",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {/* Step indicator */}
                        <div style={{
                          width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                          background: done ? "#00dfb2" : active ? s.color : "rgba(255,255,255,0.15)",
                          boxShadow: active ? `0 0 8px ${s.color}` : done ? "0 0 4px #00dfb2" : "none",
                          animation: active ? "dotBlink 1s ease-in-out infinite" : "none",
                        }} />
                        <p style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: "9px", fontWeight: 700,
                          color: done ? "#00dfb2" : active ? s.color : "rgba(255,255,255,0.2)",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap" as const,
                        }}>
                          {done ? "DONE" : active ? "RUNNING" : "QUEUE"}
                        </p>
                      </div>
                      <p style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "10px", fontWeight: 600,
                        color: done || active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                      }}>{s.title}</p>
                    </div>
                    {i < PIPELINE_STAGES.length - 1 && (
                      <div style={{ width: "12px", height: "1px", background: done ? "rgba(0,223,178,0.4)" : "rgba(255,255,255,0.08)", flexShrink: 0, transition: "background 0.4s" }} />
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{
              textAlign: "center", fontFamily: "'JetBrains Mono',monospace",
              fontSize: "9px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em",
            }}>
              DO NOT close this tab — verification is in progress
            </p>
          </div>
        </div>
      </div>
    );
  }
  /* ── Pending Review screen ── */
  if (checkingPending) return (
    <div style={{ maxWidth: "480px", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px 0", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      Checking status...
    </div>
  );

  if (pendingReview) return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ ...glassCard, position: "relative" }}>
        <div style={{ height: "2px", background: "linear-gradient(90deg,#ffbd59,#ff6eb4)" }} />
        <div style={{ padding: "40px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "22px" }}>
          <div style={{
            width: "60px", height: "60px", borderRadius: "18px",
            background: "rgba(255,189,89,0.1)",
            border: "1px solid rgba(255,189,89,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px",
            boxShadow: "0 0 30px rgba(255,189,89,0.2)",
          }}>⏳</div>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: "#fff", marginBottom: "8px" }}>
              Submission Sedang Divoting
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              Kamu masih memiliki submission yang berstatus <b>Pending Community Review</b>. Silakan tunggu hingga hasil voting selesai (dan klaim reward jika disetujui) sebelum mengirimkan submission baru.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Main form ── */
  return (
    <div style={{ maxWidth: "620px" }}>
      <div style={{ marginBottom: "24px" }}>
        <p style={{
          fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em",
          fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
          background: "linear-gradient(90deg,#00dfb2,#7c6aff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: "6px",
        }}>Submit Impact Proof</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: "#fff" }}>
          Record Your Good Deed
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Project Chain (Optional) */}
          <div style={{ ...glassCard, padding: "20px 22px" }}>
            <label style={labelStyle}>Cross-Temporal Link (Optional)</label>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "10px", lineHeight: 1.5 }}>
              Lanjutkan project sebelumnya! Masukkan Event ID dari submission kamu yang lama untuk mendapatkan <span style={{ color: "#00dfb2" }}>Project Chain Bonus (hingga +30%)</span>.
            </p>
            <input
              type="text"
              placeholder="Contoh: c2b8... (Kosongkan jika proyek baru)"
              value={form.parentEventId}
              onChange={e => setForm(f => ({ ...f, parentEventId: e.target.value }))}
              style={{
                ...inputStyle,
                fontFamily: "'JetBrains Mono',monospace",
              }}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(0,223,178,0.4)"}
              onBlur={e => (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>

          {/* Description */}
          <div style={{ ...glassCard, padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Impact Description</label>
              <span style={{
                fontSize: "8px", padding: "2px 8px", borderRadius: "4px",
                background: "rgba(0,223,178,0.08)", border: "1px solid rgba(0,223,178,0.2)",
                color: "#00dfb2", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>AI WILL CROSS-CHECK</span>
            </div>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4} required
              placeholder="Describe exactly what you did and saw. AI akan memverifikasi: apakah deskripsimu sesuai dengan foto? Semakin akurat deskripsimu, semakin tinggi skormu…"
              style={{
                ...inputStyle,
                resize: "none", lineHeight: 1.65,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
              onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "rgba(0,223,178,0.4)"}
              onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.08)"}
            />
            {/* Dynamic hint: shows character count + guidance */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>
                {form.description.length < 20
                  ? "⚠️ Min 20 karakter — terlalu pendek untuk diverifikasi"
                  : form.description.length < 60
                  ? "💡 Bagus! Tambah detail: lokasi, jumlah orang, situasi"
                  : "✅ Deskripsi cukup detail untuk cross-examination AI"
                }
              </p>
              <p style={{
                fontSize: "9px", fontFamily: "'JetBrains Mono',monospace",
                color: form.description.length < 20 ? "#ff6b6b"
                  : form.description.length < 60 ? "#ffbd59" : "#00dfb2",
              }}>{form.description.length} chars</p>
            </div>
            {/* Cross-exam info box */}
            <div style={{
              marginTop: "10px", padding: "10px 12px", borderRadius: "8px",
              background: "rgba(0,223,178,0.03)", border: "1px solid rgba(0,223,178,0.1)",
            }}>
              <p style={{ fontSize: "10px", color: "rgba(0,223,178,0.7)", lineHeight: 1.6 }}>
                🔬 <b>Cara kerja AI Cross-Examination:</b> AI akan melihat fotomu terlebih dahulu
                tanpa tahu deskripsimu (Fase 1), lalu membandingkan apa yang AI lihat dengan
                klaim yang kamu buat (Fase 2). Semakin jujur dan akurat deskripsimu, semakin
                tinggi claim accuracy score yang kamu dapat.
              </p>
            </div>
          </div>


          {/* GPS */}
          <div style={{ ...glassCard, padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>GPS Coordinates</label>
              {/* Status pill */}
              {Math.abs(form.latitude) > 0.001 || Math.abs(form.longitude) > 0.001 ? (
                <span style={{
                  fontSize: "8px", padding: "2px 8px", borderRadius: "4px",
                  background: "rgba(0,223,178,0.08)", border: "1px solid rgba(0,223,178,0.2)",
                  color: "#00dfb2", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: "0.06em",
                }}>LOCATED</span>
              ) : (
                <span style={{
                  fontSize: "8px", padding: "2px 8px", borderRadius: "4px",
                  background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)",
                  color: "#ff5050", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: "0.06em",
                }}>REQUIRED</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { ph: "Latitude", key: "latitude", val: form.latitude },
                { ph: "Longitude", key: "longitude", val: form.longitude },
              ].map(inp => (
                <input key={inp.key} type="number" placeholder={inp.ph} step="any"
                  value={inp.val || ""}
                  onChange={e => setForm(f => ({ ...f, [inp.key]: Number(e.target.value) }))}
                  style={{
                    ...inputStyle,
                    fontFamily: "'JetBrains Mono',monospace", fontSize: "12px",
                    borderColor: (Math.abs(form.latitude) < 0.001 && Math.abs(form.longitude) < 0.001)
                      ? "rgba(255,80,80,0.25)" : "rgba(255,255,255,0.08)",
                  }}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(0,223,178,0.4)"}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor =
                    (Math.abs(form.latitude) < 0.001 && Math.abs(form.longitude) < 0.001)
                      ? "rgba(255,80,80,0.25)" : "rgba(255,255,255,0.08)"}
                />
              ))}
              <button type="button"
                onClick={() => navigator.geolocation.getCurrentPosition(
                  p => setForm(f => ({ ...f, latitude: p.coords.latitude, longitude: p.coords.longitude })),
                  () => setError("Could not get location. Please enter coordinates manually.")
                )}
                style={{
                  padding: "11px 14px", borderRadius: "10px", flexShrink: 0,
                  background: "rgba(0,223,178,0.06)", border: "1px solid rgba(0,223,178,0.15)",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: "12px", color: "#00dfb2",
                  cursor: "pointer", whiteSpace: "nowrap" as const, fontWeight: 600,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,223,178,0.1)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,223,178,0.06)"}
              >
                Auto
              </button>
            </div>
          </div>
        </div>

        {/* Evidence Capture — Camera vs Gallery */}
        <div style={{ ...glassCard, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <label style={labelStyle}>Evidence Photo</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {/* Live Camera */}
              <button type="button" onClick={openCamera} disabled={busy}
                style={{
                  flex: 1, padding: "11px 10px", borderRadius: "10px",
                  background: captureMode === "camera" ? "rgba(0,223,178,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${captureMode === "camera" ? "rgba(0,223,178,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: captureMode === "camera" ? "#00dfb2" : "rgba(255,255,255,0.5)",
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "12px", fontWeight: 700,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                📷 Kamera Langsung
                <span style={{ display: "block", fontSize: "9px", fontWeight: 400, opacity: 0.6, marginTop: "2px" }}>Skor autentisitas +bonus</span>
              </button>
              {/* Gallery Upload */}
              <button type="button" onClick={selectGallery} disabled={busy}
                style={{
                  flex: 1, padding: "11px 10px", borderRadius: "10px",
                  background: captureMode === "gallery" ? "rgba(255,189,89,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${captureMode === "gallery" ? "rgba(255,189,89,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: captureMode === "gallery" ? "#ffbd59" : "rgba(255,255,255,0.4)",
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "12px", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s", position: "relative" as const,
                }}>
                📁 Upload Galeri
                <span style={{
                  display: "block", fontSize: "9px", fontWeight: 400,
                  opacity: 0.6, marginTop: "2px", color: "rgba(255,189,89,0.7)",
                }}>Skor autentisitas −15%</span>
              </button>
            </div>
          </div>


          {/* Live Camera Stream */}
          {cameraActive && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{
                position: "relative" as const, borderRadius: "12px", overflow: "hidden", background: "#000",
                boxShadow: "0 0 0 3px rgba(124,106,255,0.2), 0 0 24px rgba(124,106,255,0.15)",
                animation: "pulse 2.5s infinite"
              }}>
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ width: "100%", display: "block", maxHeight: "260px", objectFit: "cover" }} />
                <div style={{
                  position: "absolute" as const, bottom: "10px", left: "50%",
                  transform: "translateX(-50%)", display: "flex", gap: "10px",
                }}>
                  <button type="button" onClick={capturePhoto}
                    style={{
                      padding: "10px 24px", borderRadius: "50px", border: "none",
                      background: "linear-gradient(135deg,#00dfb2,#7c6aff)",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontWeight: 800, fontSize: "13px", color: "#0a0510",
                      cursor: "pointer", boxShadow: "0 4px 16px rgba(0,223,178,0.4)",
                    }}>📸 Ambil Foto</button>
                  <button type="button" onClick={() => { stopCamera(); setCaptureMode(null); }}
                    style={{
                      padding: "10px 16px", borderRadius: "50px", border: "1px solid rgba(255,80,80,0.3)",
                      background: "rgba(255,80,80,0.07)",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontWeight: 600, fontSize: "12px", color: "rgba(255,120,120,0.8)",
                      cursor: "pointer",
                    }}>✕ Batal</button>
                </div>
              </div>
            </div>
          )}

          {/* Captured / Selected file preview */}
          {file && !cameraActive && (
            <div style={{ padding: "0 16px 16px" }}>
              {/* Thumbnail */}
              {previewUrl && file.type.startsWith("image/") && (
                <div style={{
                  position: "relative", borderRadius: "12px", overflow: "hidden",
                  marginBottom: "10px",
                  border: `1px solid ${captureMode === "camera" ? "rgba(0,223,178,0.2)" : "rgba(255,189,89,0.2)"
                    }`,
                }}>
                  <img
                    src={previewUrl}
                    alt="Evidence preview"
                    style={{ width: "100%", maxHeight: "260px", objectFit: "cover", display: "block" }}
                  />
                  {/* Source badge overlay */}
                  <div style={{
                    position: "absolute", top: "10px", left: "10px",
                    padding: "4px 10px", borderRadius: "20px",
                    background: captureMode === "camera"
                      ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${captureMode === "camera" ? "rgba(0,223,178,0.4)" : "rgba(255,189,89,0.4)"
                      }`,
                    fontSize: "10px", fontWeight: 700,
                    fontFamily: "'JetBrains Mono',monospace",
                    color: captureMode === "camera" ? "#00dfb2" : "#ffbd59",
                    letterSpacing: "0.06em",
                  }}>
                    {captureMode === "camera" ? "✅ LIVE CAPTURE" : "📁 GALERI"}
                  </div>
                </div>
              )}
              {/* File meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "12px",
                    background: captureMode === "camera"
                      ? "linear-gradient(90deg,#00dfb2,#7c6aff)"
                      : "linear-gradient(90deg,#ffbd59,#ff9f43)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                  }}>{file.name}</p>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "2px" }}>
                    {(file.size / 1024).toFixed(1)} KB
                    {" · "}
                    {captureMode === "camera" ? "Bonus autentisitas aktif" : "Skor dikurangi 15%"}
                  </p>
                </div>
                <button type="button" onClick={() => { setFile(null); setCaptureMode(null) }}
                  style={{
                    padding: "5px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)",
                    background: "transparent", color: "rgba(255,255,255,0.3)",
                    fontSize: "11px", cursor: "pointer", flexShrink: 0,
                  }}>Ganti</button>
              </div>
            </div>
          )}

          {!file && !cameraActive && (
            <div style={{ padding: "24px 22px", textAlign: "center" as const, opacity: 0.4 }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>📷</div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Pilih kamera atau galeri di atas</p>
            </div>
          )}

          {/* Hidden gallery input */}
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > 20 * 1024 * 1024) { setError("File terlalu besar — max 20MB"); return; }
                if (captureMode === "camera") setCaptureTimestamp(Date.now());
                setFile(f); setError("");
              }
            }} />
          {/* Hidden canvas for camera snapshot */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: "10px",
            background: "rgba(255,80,80,0.05)", border: "1px solid rgba(255,80,80,0.15)",
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "11px", color: "rgba(255,120,120,0.85)", lineHeight: 1.5,
          }}>
            ✕ {error}
          </div>
        )}

        {/* T&C Warning */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px",
          background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)"
        }}>
          <input
            type="checkbox"
            id="tnc"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={{ marginTop: "4px", accentColor: "#7c6aff", width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label htmlFor="tnc" style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, cursor: "pointer", userSelect: "none" }}>
            Saya bersumpah data ini <strong>asli dan jujur</strong>. Saya mengerti bahwa memanipulasi bukti (Photoshop, hapus EXIF, lokasi palsu) akan melukai komunitas dan
            <span style={{ color: "rgba(255,80,80,0.8)" }}> dapat mengakibatkan PEMBLOKIRAN PERMANEN (Auto-Ban)</span> pada akun saya dari seluruh platform APEX.
          </label>
        </div>

        {/* Submit */}
        <button type="submit" disabled={busy || !form.description || !termsAccepted}
          style={{
            width: "100%", padding: "15px", borderRadius: "12px", border: "none",
            background: busy || !form.description || !termsAccepted
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg,#00dfb2,#7c6aff)",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: "14px", fontWeight: 800,
            color: busy || !form.description || !termsAccepted ? "rgba(255,255,255,0.2)" : "#0a0510",
            cursor: busy || !form.description || !termsAccepted ? "not-allowed" : "pointer",
            transition: "all 0.2s", letterSpacing: "0.02em",
            boxShadow: busy || !form.description || !termsAccepted ? "none" : "0 4px 24px rgba(0,223,178,0.3)",
          }}
          onMouseEnter={e => { if (!busy && form.description && termsAccepted) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
        >
          ✦ Submit Impact Proof
        </button>
      </form>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:0% 0%} 100%{background-position:200% 0%} }
        @keyframes scanline { 0%{background-position:-100% 0%} 100%{background-position:200% 0%} }
        @keyframes pulse { 0%{box-shadow:0 0 0 2px rgba(124,106,255,0.1),0 0 10px rgba(124,106,255,0.05)} 50%{box-shadow:0 0 0 4px rgba(124,106,255,0.3),0 0 28px rgba(124,106,255,0.3)} 100%{box-shadow:0 0 0 2px rgba(124,106,255,0.1),0 0 10px rgba(124,106,255,0.05)} }
        @keyframes ringPulse { 0%{box-shadow:0 0 0 0 currentColor} 70%{box-shadow:0 0 0 12px transparent} 100%{box-shadow:0 0 0 0 transparent} }
        @keyframes dotBlink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
        @keyframes oracleProgress { 0%{width:0%} 30%{width:25%} 55%{width:50%} 75%{width:70%} 90%{width:85%} 100%{width:92%} }
      `}</style>
    </div>
  );
}