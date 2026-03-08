"use client";

import { useState, useEffect, useCallback } from "react";
import { ENV } from "../utils/env";

const ORACLE_API = ENV.ORACLE_URL;
const API_KEY = ENV.HAVEN_ORACLE_KEY || "HAVEN_ROKAN_NJXBDSA_010011";

function hFetch(path: string) {
  return fetch(`${ORACLE_API}${path}`, { headers: { "X-HAVEN-Oracle-Key": API_KEY } });
}

interface Phase {
  phase: string; name: string; description: string;
  milestones: string[]; target_year: number;
  status: "active" | "planned" | "vision";
}
interface LayerStatus {
  id: string; name: string; status: string; endpoints: string[];
}

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

const STATUS_LABEL: Record<string, string> = {
  active: "Active", planned: "Planned", vision: "Vision",
};

function PhaseCard({ phase, isCurrent }: { phase: Phase; isCurrent: boolean }) {
  return (
    <div style={{
      padding: "28px",
      border: `1px solid rgba(255,255,255,${isCurrent ? 0.15 : 0.06})`,
      borderTop: `${isCurrent ? "2px" : "1px"} solid rgba(255,255,255,${isCurrent ? 0.5 : 0.06})`,
      background: isCurrent ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.008)",
      position: "relative",
      transition: "border-color 0.2s",
    }}>
      {/* Live indicator */}
      {isCurrent && (
        <div style={{
          position: "absolute", top: "28px", right: "28px",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <div style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: "rgba(255,255,255,0.6)",
            animation: "psLive 2.6s ease-in-out infinite",
          }} />
          <span style={{ fontFamily: M, fontSize: "8px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)" }}>
            CURRENT
          </span>
        </div>
      )}

      {/* Phase label + year */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "10px" }}>
        <span style={{
          fontFamily: S, fontStyle: "italic", fontSize: "10px",
          color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase",
        }}>{STATUS_LABEL[phase.status]}</span>
        <span style={{ fontFamily: M, fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
          {phase.target_year}
        </span>
      </div>

      <h3 style={{
        fontFamily: S, fontWeight: 400,
        fontSize: isCurrent ? "20px" : "17px",
        color: isCurrent ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
        marginBottom: "8px",
      }}>{phase.name}</h3>

      <p style={{
        fontFamily: S, fontStyle: "italic", fontSize: "12px",
        color: "rgba(255,255,255,0.4)", lineHeight: 1.75, marginBottom: "16px",
      }}>{phase.description}</p>

      {/* Milestones */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {phase.milestones.map(m => (
          <span key={m} style={{
            fontFamily: S, fontStyle: "italic", fontSize: "10px",
            padding: "4px 10px",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.35)",
          }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function LayerRow({ layer, isLast }: { layer: LayerStatus; isLast: boolean }) {
  const isActive = layer.status === "active";
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "36px 1fr auto",
      alignItems: "center", gap: "16px",
      padding: "14px 0",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{
        fontFamily: M, fontSize: "10px",
        color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em",
      }}>{layer.id}</span>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0,
          background: isActive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)",
        }} />
        <span style={{
          fontFamily: S, fontSize: "13px",
          color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
        }}>{layer.name}</span>
      </div>

      <span style={{
        fontFamily: S, fontStyle: "italic", fontSize: "10px",
        color: `rgba(255,255,255,${isActive ? 0.6 : 0.2})`,
        letterSpacing: "0.08em",
      }}>{layer.status}</span>
    </div>
  );
}

export default function ProtocolStatus() {
  const [roadmap, setRoadmap] = useState<Phase[]>([]);
  const [layers, setLayers] = useState<LayerStatus[]>([]);
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProtocolData = useCallback(async () => {
    setLoading(true);
    try {
      const [rm, ly, st] = await Promise.all([
        hFetch("/api/v1/protocol/roadmap").then(r => r.json()),
        hFetch("/api/v1/protocol/layers").then(r => r.json()),
        hFetch("/api/v1/protocol/status").then(r => r.json()),
      ]);
      setRoadmap(rm.phases || []);
      setLayers(ly.layers || []);
      setCurrentPhase(st.current_phase || null);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProtocolData(); }, [loadProtocolData]);

  if (loading) return (
    <div style={{ padding: "80px 0", textAlign: "center" }}>
      <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "14px", color: "rgba(255,255,255,0.25)" }}>
        Retrieving protocol data…
      </p>
    </div>
  );

  const activeLayers = layers.filter(l => l.status === "active").length;

  return (
    <div style={{ maxWidth: "800px" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", textTransform: "uppercase",
          }}>§ Architecture & Roadmap</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>
        <h2 style={{ fontFamily: S, fontWeight: 400, fontSize: "30px", color: "#fff", marginBottom: "6px" }}>
          Protocol Status
        </h2>
        <p style={{ fontFamily: S, fontStyle: "italic", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
          HAVEN Humanity Protocol — 8 Layers, 6 Deployment Phases
        </p>
      </div>

      {/* Quick stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        borderTop: "2px solid #fff",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "48px",
      }}>
        {[
          { label: "Active Layers",    value: `${activeLayers} / 9` },
          { label: "Current Phase",    value: currentPhase?.name || "Genesis" },
          { label: "Protocol Version", value: "v2.0.0" },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: "24px 20px",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}>
            <p style={{
              fontFamily: S, fontStyle: "italic", fontSize: "10px",
              color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em",
              textTransform: "uppercase", marginBottom: "8px",
            }}>{s.label}</p>
            <p style={{ fontFamily: M, fontSize: "18px", color: "rgba(255,255,255,0.85)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Architecture layers */}
      <div style={{ marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "4px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase",
          }}>Architecture Layers</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div style={{
          border: "1px solid rgba(255,255,255,0.07)",
          borderTop: "2px solid rgba(255,255,255,0.2)",
          padding: "0 24px",
        }}>
          {layers.map((l, i) => (
            <LayerRow key={l.id} layer={l} isLast={i === layers.length - 1} />
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <span style={{
            fontFamily: S, fontSize: "10px", fontStyle: "italic",
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase",
          }}>Deployment Roadmap</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {roadmap.map(phase => (
            <PhaseCard
              key={phase.phase}
              phase={phase}
              isCurrent={currentPhase?.phase === phase.phase}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes psLive { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.6)} }
      `}</style>
    </div>
  );
}