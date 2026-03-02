"use client";

import { useState, useEffect } from "react";
import { ENV } from "../utils/env";

const ORACLE_API = ENV.ORACLE_URL;
const API_KEY = ENV.SATIN_API_KEY || "apex-dev-key-change-in-prod";

function hFetch(path: string) {
    return fetch(`${ORACLE_API}${path}`, { headers: { "X-APEX-Oracle-Key": API_KEY } });
}

interface Phase {
    phase: string;
    name: string;
    description: string;
    milestones: string[];
    target_year: number;
    status: "active" | "planned" | "vision";
}

interface LayerStatus {
    id: string;
    name: string;
    status: string;
    endpoints: string[];
}

const STATUS_COLORS = {
    active: { text: "#6bff9e", bg: "rgba(107,255,158,0.12)", border: "rgba(107,255,158,0.3)" },
    planned: { text: "var(--vi)", bg: "var(--vi-dim)", border: "var(--vi-edge)" },
    vision: { text: "var(--go)", bg: "var(--go-dim)", border: "var(--go-edge)" },
};

function PhaseCard({ phase, isCurrent }: { phase: Phase; isCurrent: boolean }) {
    const cols = STATUS_COLORS[phase.status];
    return (
        <div style={{
            padding: "16px 18px", borderRadius: "var(--r2)",
            background: isCurrent ? "linear-gradient(135deg, var(--vi-deep), var(--mi-deep))" : "var(--g1)",
            border: `1px solid ${isCurrent ? "var(--vi-edge)" : "var(--b0)"}`,
            position: "relative", overflow: "hidden",
        }}>
            {isCurrent && (
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                    background: "linear-gradient(90deg, var(--vi), var(--mi))",
                }} />
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isCurrent && (
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--mi)", display: "inline-block", animation: "pulse 2s infinite" }} />
                    )}
                    <span style={{
                        fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                        color: cols.text, background: cols.bg,
                        border: `1px solid ${cols.border}`, padding: "2px 8px", borderRadius: "99px",
                        textTransform: "uppercase",
                    }}>{phase.status}</span>
                </div>
                <span style={{
                    fontSize: "11px", fontFamily: "'JetBrains Mono', monospace",
                    color: isCurrent ? "var(--mi)" : "var(--t2)",
                }}>{phase.target_year}</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: "14px", color: "var(--t0)", marginBottom: "4px" }}>
                {phase.name}
            </p>
            <p style={{ fontSize: "12px", color: "var(--t1)", lineHeight: 1.5, marginBottom: "10px" }}>
                {phase.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {phase.milestones.map(m => (
                    <span key={m} style={{
                        fontSize: "10px", padding: "2px 7px", borderRadius: "4px",
                        background: "rgba(255,255,255,0.04)", color: "var(--t2)",
                        border: "1px solid var(--b0)",
                    }}>☑ {m}</span>
                ))}
            </div>
        </div>
    );
}

function LayerRow({ layer }: { layer: LayerStatus }) {
    const isActive = layer.status === "active";
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 0", borderBottom: "1px solid var(--b0)",
        }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--t2)", width: "32px", flexShrink: 0 }}>
                {layer.id}
            </span>
            <span style={{
                width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                background: isActive ? "var(--mi)" : "var(--t2)",
                boxShadow: isActive ? "0 0 8px var(--mi-glow)" : "none",
            }} />
            <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: isActive ? "var(--t0)" : "var(--t2)" }}>
                {layer.name}
            </span>
            <span style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: isActive ? "#6bff9e" : "var(--t2)",
                padding: "2px 8px", borderRadius: "99px",
                background: isActive ? "rgba(107,255,158,0.1)" : "rgba(255,255,255,0.03)",
                border: isActive ? "1px solid rgba(107,255,158,0.2)" : "1px solid var(--b0)",
            }}>{layer.status}</span>
        </div>
    );
}

export default function ProtocolStatus() {
    const [roadmap, setRoadmap] = useState<Phase[]>([]);
    const [layers, setLayers] = useState<LayerStatus[]>([]);
    const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            hFetch("/api/v1/protocol/roadmap").then(r => r.json()),
            hFetch("/api/v1/protocol/layers").then(r => r.json()),
            hFetch("/api/v1/protocol/status").then(r => r.json()),
        ]).then(([rm, ly, st]) => {
            setRoadmap(rm.phases || []);
            setLayers(ly.layers || []);
            setCurrentPhase(st.current_phase || null);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--t2)" }}>
            <p style={{ fontSize: "13px" }}>Loading protocol status…</p>
        </div>
    );

    const activeLayers = layers.filter(l => l.status === "active").length;

    return (
        <div style={{ maxWidth: "780px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--t0)", margin: "0 0 6px" }}>
                    Protocol Status
                </h2>
                <p style={{ fontSize: "12px", color: "var(--t2)" }}>
                    APEX Humanity Protocol Architecture — 8 Layers, 6 Deployment Phases
                </p>
            </div>

            {/* Quick Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "28px" }}>
                {[
                    { label: "Active Layers", value: `${activeLayers}/9`, color: "#6bff9e" },
                    { label: "Current Phase", value: currentPhase?.name || "Genesis", color: "var(--mi)" },
                    { label: "Protocol Version", value: "v2.0.0", color: "var(--vi)" },
                ].map(s => (
                    <div key={s.label} style={{ padding: "14px", borderRadius: "var(--r2)", background: "var(--g1)", border: "1px solid var(--b0)", textAlign: "center" }}>
                        <p style={{ fontSize: "10px", color: "var(--t2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{s.label}</p>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 700, color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Layer Status */}
            <div style={{ padding: "20px", borderRadius: "var(--r3)", background: "var(--g1)", border: "1px solid var(--b0)", marginBottom: "24px" }}>
                <p style={{ fontWeight: 700, color: "var(--t0)", fontSize: "14px", marginBottom: "12px" }}>
                    Architecture Layers
                </p>
                {layers.map(l => <LayerRow key={l.id} layer={l} />)}
            </div>

            {/* Roadmap */}
            <div>
                <p style={{ fontWeight: 700, color: "var(--t0)", fontSize: "14px", marginBottom: "12px" }}>
                    Deployment Roadmap
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {roadmap.map(phase => (
                        <PhaseCard
                            key={phase.phase}
                            phase={phase}
                            isCurrent={currentPhase?.phase === phase.phase}
                        />
                    ))}
                </div>
            </div>

            <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }`}</style>
        </div>
    );
}
