"use client";

/**
 * HAVEN — useTheme
 * ================
 * Central hook untuk semua komponen. Expose solid color tokens
 * yang otomatis berubah sesuai data-theme di <html>.
 *
 * Usage:
 *   const T = useTheme();
 *   <div style={{ background: T.bg, color: T.text }}>
 *
 * Semua warna SOLID — tidak ada opacity trick.
 * Dark: ink on obsidian. Light: ink on parchment.
 */

import { useState, useEffect } from "react";

export interface ThemeTokens {
  // ── Canvas ──
  bg:      string;  // page background
  bg2:     string;  // card background
  bg3:     string;  // elevated/active surface
  nav:     string;  // navbar background

  // ── Text (solid, no opacity) ──
  text:    string;  // primary text        dark=#F9F6F1   light=#0C0B0A
  t2:      string;  // secondary text      dark=#9C9488   light=#5A5650
  t3:      string;  // tertiary text       dark=#6B6560   light=#8A8480
  t4:      string;  // muted / placeholder dark=#4A4642   light=#B0ABA6
  t5:      string;  // very muted          dark=#312E2B   light=#CCC8C2

  // ── Borders (solid) ──
  border:  string;  // subtle              dark=#1E1C19   light=#D8D2C8
  border2: string;  // medium              dark=#2C2925   light=#C4BDB4
  border3: string;  // strong              dark=#403C38   light=#A09890
  borderStr: string; // heavy rule         dark=#7A7470   light=#5A5650

  // ── Surfaces ──
  surf:    string;  // hover bg            dark=#111009   light=#EAE4DA
  surf2:   string;  // active bg           dark=#161410   light=#E0D9CE

  // ── Action (primary button) ──
  actionBg:   string;  // dark=#F9F6F1  light=#0C0B0A
  actionText: string;  // dark=#080706  light=#F3EFE7
  actionHover: string; // dark=#EAE4DA  light=#1A1815

  // ── Current theme name ──
  isDark: boolean;
}

const DARK: ThemeTokens = {
  bg:         "#080706",
  bg2:        "#0d0c0b",
  bg3:        "#111009",
  nav:        "#080706",
  text:       "#F9F6F1",
  t2:         "#9C9488",
  t3:         "#6B6560",
  t4:         "#4A4642",
  t5:         "#2A2826",
  border:     "#1E1C19",
  border2:    "#2C2925",
  border3:    "#403C38",
  borderStr:  "#7A7470",
  surf:       "#111009",
  surf2:      "#161410",
  actionBg:   "#F9F6F1",
  actionText: "#080706",
  actionHover:"#EAE4DA",
  isDark:     true,
};

const LIGHT: ThemeTokens = {
  bg:         "#F3EFE7",
  bg2:        "#EAE4DA",
  bg3:        "#E0D9CE",
  nav:        "#F3EFE7",
  text:       "#0C0B0A",
  t2:         "#5A5650",
  t3:         "#7A7672",
  t4:         "#A8A4A0",
  t5:         "#C8C4C0",
  border:     "#D8D2C8",
  border2:    "#C4BDB4",
  border3:    "#A09890",
  borderStr:  "#706860",
  surf:       "#EAE4DA",
  surf2:      "#E0D9CE",
  actionBg:   "#0C0B0A",
  actionText: "#F3EFE7",
  actionHover:"#1A1815",
  isDark:     false,
};

export function useTheme(): ThemeTokens {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Read initial theme from html attribute
    const read = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      setIsDark(attr !== "light");
    };
    read();

    // Watch for changes (set by index.tsx toggleTheme)
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark ? DARK : LIGHT;
}