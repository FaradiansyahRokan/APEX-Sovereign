"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  context?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State { hasError: boolean; error: Error | null; }

const S = "Georgia, 'Times New Roman', serif";
const M = "'JetBrains Mono', monospace";

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[HAVEN ErrorBoundary]", error, info);
    this.props.onError?.(error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const context = this.props.context ?? "Component";
    const message = this.state.error?.message ?? "Unknown error";

    return (
      <div style={{
        padding: "48px 0",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          maxWidth: "520px", width: "100%",
          border: "1px solid var(--hv-border2)",
          borderTop: "2px solid var(--hv-border-str)",
          background: "var(--hv-bg2)",
          padding: "32px",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
            <span style={{
              fontFamily: S, fontSize: "10px", fontStyle: "italic",
              color: "var(--hv-t4)", letterSpacing: "0.2em", textTransform: "uppercase",
            }}>System Notice</span>
            <div style={{ flex: 1, height: "1px", background: "var(--hv-surf2)" }} />
          </div>

          <h3 style={{
            fontFamily: S, fontWeight: 400, fontSize: "20px",
            color: "var(--hv-t2)", marginBottom: "10px",
          }}>
            {context} Render Error
          </h3>

          <p style={{
            fontFamily: S, fontStyle: "italic", fontSize: "13px",
            color: "var(--hv-t4)", lineHeight: 1.7, marginBottom: "20px",
          }}>
            An unexpected error occurred within this component. This is likely a
            transient issue. You may attempt to recover or reload the page.
          </p>

          {/* Error trace */}
          <div style={{
            padding: "16px",
            background: "var(--hv-bg2)",
            border: "1px solid var(--hv-border)",
            marginBottom: "24px",
            overflowX: "auto",
          }}>
            <p style={{
              fontFamily: M, fontSize: "11px",
              color: "var(--hv-t4)", wordBreak: "break-word",
              lineHeight: 1.6,
            }}>{message}</p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={this.handleRetry} style={{
              flex: 1, padding: "12px",
              background: "var(--hv-action-bg)", border: "none", color: "var(--hv-action-text)",
              fontFamily: S, fontSize: "11px", letterSpacing: "0.15em",
              textTransform: "uppercase", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              Retry
            </button>
            <button onClick={() => window.location.reload()} style={{
              flex: 1, padding: "12px",
              background: "transparent",
              border: "1px solid var(--hv-border2)",
              color: "var(--hv-t3)",
              fontFamily: S, fontSize: "11px", letterSpacing: "0.15em",
              textTransform: "uppercase", cursor: "pointer",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--hv-surf)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;