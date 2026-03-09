"use client";

import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function LandingPage() {
  const router = useRouter();
  const goToApp = () => router.push("/app");

  return (
    <>
      <Head>
        <title>HAVEN Humanity Action Verification & Economic Network</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Tenor+Sans&display=swap" />
        {/* CSS harus di <Head> agar tidak trigger hydration error */}
        <style dangerouslySetInnerHTML={{
          __html: `
          :root {
            --ink: #0C0B0A; --ink-soft: #1A1815; --ink-mid: #2C2924;
            --ash: #47433E; --stone: #746E67; --silver: #ABA49B;
            --linen: #D5CFC5; --parchment: #EAE4DA; --cream: #F3EFE7;
            --bone: #F9F6F1; --white: #FDFAF6;
            --serif-display: 'Cormorant Garamond', 'Times New Roman', Georgia, serif;
            --serif-alt: 'Cormorant', Georgia, serif;
            --serif-body: 'EB Garamond', Georgia, serif;
            --sans-label: 'Tenor Sans', 'Gill Sans', Optima, sans-serif;
            --mw: 1320px; --gutter: clamp(20px, 5vw, 88px);
            --col-gap: 1px solid rgba(12,11,10,0.09);
          }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; font-size: 16px; }
          body {
            background: var(--bone); color: var(--ink);
            font-family: var(--serif-body); font-size: 17px;
            line-height: 1.72; -webkit-font-smoothing: antialiased; overflow-x: hidden;
          }
          ::selection { background: var(--ink); color: var(--bone); }
          ::-webkit-scrollbar { width: 2px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: var(--linen); }
          body::after {
            content: ''; position: fixed; inset: 0; z-index: 9999; pointer-events: none; opacity: 0.026;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          }
          .lp-label-caps { font-family: var(--sans-label); font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--silver); }
          .lp-section-wrap { max-width: var(--mw); margin: 0 auto; padding-left: var(--gutter); padding-right: var(--gutter); }
          /* NAV */
          .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; height: 68px; display: flex; align-items: center; justify-content: space-between; padding: 0 var(--gutter); background: rgba(249,246,241,0.92); backdrop-filter: blur(18px) saturate(0.85); -webkit-backdrop-filter: blur(18px) saturate(0.85); border-bottom: 1px solid rgba(12,11,10,0.07); }
          .lp-nav-wordmark { font-family: var(--serif-display); font-size: 18px; font-weight: 300; letter-spacing: 0.45em; text-transform: uppercase; color: var(--ink); text-decoration: none; }
          .lp-nav-version { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--silver); border: 1px solid var(--linen); padding: 3px 8px; }
          .lp-nav-links { display: flex; align-items: center; gap: 36px; list-style: none; }
          .lp-nav-links a { font-family: var(--sans-label); font-size: 9.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--stone); text-decoration: none; transition: color 0.2s; }
          .lp-nav-links a:hover { color: var(--ink); }
          .lp-nav-btn { font-family: var(--sans-label); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--bone); background: var(--ink); border: none; padding: 10px 22px; cursor: pointer; transition: background 0.2s; }
          .lp-nav-btn:hover { background: var(--ash); }
          /* HERO */
          .lp-hero { min-height: 100vh; padding-top: 68px; display: flex; flex-direction: column; }
          .lp-hero-body { flex: 1; max-width: var(--mw); margin: 0 auto; padding: 0 var(--gutter); width: 100%; display: grid; grid-template-columns: 1.15fr 1px 0.85fr; min-height: calc(100vh - 68px - 48px); }
          .lp-hero-left { display: flex; flex-direction: column; justify-content: center; padding: 80px 72px 80px 0; border-right: var(--col-gap); }
          .lp-hero-eyebrow { display: flex; align-items: center; gap: 16px; margin-bottom: 44px; animation: lpFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
          .lp-hero-eyebrow::before { content: ''; display: block; width: 36px; height: 1px; background: var(--silver); }
          .lp-hero-headline { font-family: var(--serif-display); font-size: clamp(48px, 5.8vw, 84px); font-weight: 300; line-height: 1.06; letter-spacing: -0.015em; color: var(--ink); margin-bottom: 12px; animation: lpFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
          .lp-hero-headline em { font-style: italic; color: var(--ash); }
          .lp-hero-subhead { font-family: var(--serif-display); font-size: clamp(14px, 1.4vw, 18px); font-weight: 300; letter-spacing: 0.22em; text-transform: uppercase; color: var(--silver); margin-bottom: 48px; animation: lpFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.26s both; }
          .lp-hero-desc { font-family: var(--serif-body); font-size: 16px; line-height: 1.85; color: var(--stone); max-width: 440px; margin-bottom: 56px; animation: lpFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.34s both; }
          .lp-hero-actions { display: flex; align-items: center; gap: 36px; animation: lpFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.44s both; }
          .lp-btn-primary { font-family: var(--sans-label); font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--bone); background: var(--ink); border: none; padding: 17px 38px; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.22s, transform 0.18s; }
          .lp-btn-primary:hover { background: var(--ash); transform: translateY(-1px); }
          .lp-btn-outline { font-family: var(--sans-label); font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ash); background: transparent; border: 1px solid var(--linen); padding: 16px 30px; cursor: pointer; text-decoration: none; display: inline-block; transition: border-color 0.2s, color 0.2s; }
          .lp-btn-outline:hover { border-color: var(--stone); color: var(--ink); }
          .lp-hero-divider { width: 1px; background: rgba(12,11,10,0.09); }
          .lp-hero-right { display: flex; flex-direction: column; justify-content: center; padding: 80px 0 80px 72px; }
          .lp-chain-badge { display: inline-flex; align-items: center; gap: 10px; border: 1px solid rgba(12,11,10,0.1); padding: 10px 18px; margin-bottom: 44px; width: fit-content; animation: lpFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
          .lp-chain-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ink); animation: lpPulse 2.4s ease-in-out infinite; }
          .lp-hero-stats { display: flex; flex-direction: column; animation: lpFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
          .lp-stat-row { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid rgba(12,11,10,0.08); }
          .lp-stat-row:first-child { border-top: 1px solid rgba(12,11,10,0.08); }
          .lp-stat-cell { padding: 28px 0; border-right: 1px solid rgba(12,11,10,0.08); }
          .lp-stat-cell:last-child { border-right: none; padding-left: 28px; }
          .lp-stat-label { font-family: var(--sans-label); font-size: 8.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--silver); margin-bottom: 8px; }
          .lp-stat-num { font-family: var(--serif-display); font-size: clamp(28px, 3vw, 42px); font-weight: 300; line-height: 1; letter-spacing: -0.01em; color: var(--ink); }
          .lp-stat-note { font-family: var(--serif-body); font-size: 12px; font-style: italic; color: var(--silver); margin-top: 5px; }
          .lp-key-facts { margin-top: 40px; border: 1px solid rgba(12,11,10,0.08); animation: lpFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
          .lp-key-facts-header { padding: 14px 20px; border-bottom: 1px solid rgba(12,11,10,0.08); background: var(--parchment); }
          .lp-key-fact-row { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid rgba(12,11,10,0.05); }
          .lp-key-fact-row:last-child { border-bottom: none; }
          .lp-kf-key { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--silver); }
          .lp-kf-val { font-family: var(--serif-body); font-size: 13.5px; color: var(--ash); text-align: right; }
          /* MARQUEE */
          .lp-marquee { background: var(--ink); overflow: hidden; height: 46px; display: flex; align-items: center; border-top: 1px solid rgba(12,11,10,0.15); }
          .lp-marquee-track { display: flex; white-space: nowrap; animation: lpMarquee 36s linear infinite; }
          .lp-marquee-item { display: inline-flex; align-items: center; gap: 24px; padding: 0 40px; font-family: var(--sans-label); font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--stone); }
          .lp-marquee-item::before { content: '◆'; font-size: 4.5px; color: var(--ash); }
          /* SEC HEADER */
          .lp-sec-header { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 28px; margin-bottom: 64px; border-bottom: 1px solid rgba(12,11,10,0.09); }
          .lp-sec-title { font-family: var(--serif-display); font-size: clamp(28px, 3.2vw, 46px); font-weight: 300; letter-spacing: -0.01em; color: var(--ink); }
          .lp-sec-title em { font-style: italic; color: var(--ash); }
          /* PROBLEM */
          .lp-problem { background: var(--white); border-top: 1px solid rgba(12,11,10,0.06); border-bottom: 1px solid rgba(12,11,10,0.06); }
          .lp-problem-inner { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); display: grid; grid-template-columns: 1fr 2fr; gap: 88px; align-items: start; }
          .lp-problem-label { display: flex; flex-direction: column; gap: 16px; }
          .lp-problem-label::before { content: ''; display: block; width: 40px; height: 1px; background: var(--silver); }
          .lp-problem-quote { font-family: var(--serif-display); font-size: clamp(22px, 2.5vw, 34px); font-weight: 300; font-style: italic; line-height: 1.42; color: var(--ink); margin-bottom: 52px; letter-spacing: -0.005em; }
          .lp-problem-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px 56px; }
          .lp-problem-col-title { font-family: var(--serif-display); font-size: 18px; font-weight: 400; color: var(--ink); margin-bottom: 14px; }
          .lp-problem-col-body { font-family: var(--serif-body); font-size: 15px; line-height: 1.85; color: var(--stone); }
          /* POBA */
          .lp-poba { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); }
          .lp-poba-grid { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0; margin-bottom: 88px; }
          .lp-poba-left { padding-right: 64px; }
          .lp-poba-right { padding-left: 64px; }
          .lp-poba-div { background: rgba(12,11,10,0.08); }
          .lp-poba-title { font-family: var(--serif-display); font-size: clamp(36px, 4vw, 58px); font-weight: 300; line-height: 1.1; letter-spacing: -0.01em; color: var(--ink); margin-bottom: 28px; }
          .lp-poba-title em { font-style: italic; color: var(--ash); }
          .lp-poba-body { font-family: var(--serif-body); font-size: 15.5px; line-height: 1.88; color: var(--stone); margin-bottom: 24px; }
          .lp-poba-hl { border-left: 2px solid var(--ink); padding: 20px 24px; margin: 32px 0; }
          .lp-poba-hl p { font-family: var(--serif-display); font-size: 18px; font-weight: 300; font-style: italic; line-height: 1.5; color: var(--ink); }
          .lp-action-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid rgba(12,11,10,0.08); border-left: 1px solid rgba(12,11,10,0.08); margin-bottom: 72px; }
          .lp-action-cell { padding: 32px 28px; border-right: 1px solid rgba(12,11,10,0.08); border-bottom: 1px solid rgba(12,11,10,0.08); transition: background 0.25s; }
          .lp-action-cell:hover { background: var(--white); }
          .lp-action-code { font-family: var(--sans-label); font-size: 7.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--silver); margin-bottom: 12px; display: block; }
          .lp-action-name { font-family: var(--serif-display); font-size: 16px; font-weight: 400; line-height: 1.3; color: var(--ink); margin-bottom: 10px; }
          .lp-action-sdg { font-family: var(--sans-label); font-size: 7.5px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--silver); }
          .lp-formula { background: var(--ink); color: var(--bone); padding: 48px 56px; display: grid; grid-template-columns: 1fr 1px 1fr 1px 1fr; gap: 0; }
          .lp-formula-col { padding: 0 40px; }
          .lp-formula-col:first-child { padding-left: 0; }
          .lp-formula-col:last-child { padding-right: 0; }
          .lp-formula-sep { background: rgba(253,250,246,0.07); }
          .lp-formula-layer-num { font-family: var(--serif-display); font-size: 11px; font-weight: 300; letter-spacing: 0.3em; color: var(--stone); margin-bottom: 14px; }
          .lp-formula-layer-name { font-family: var(--serif-display); font-size: 20px; font-weight: 300; color: var(--bone); margin-bottom: 16px; }
          .lp-formula-desc { font-family: var(--serif-body); font-size: 13.5px; line-height: 1.8; color: var(--stone); }
          /* SATIN */
          .lp-satin { background: var(--ink); color: var(--bone); }
          .lp-satin-inner { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); }
          .lp-satin-header { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end; margin-bottom: 80px; padding-bottom: 52px; border-bottom: 1px solid rgba(253,250,246,0.07); }
          .lp-satin-title { font-family: var(--serif-display); font-size: clamp(32px, 4vw, 58px); font-weight: 300; line-height: 1.1; letter-spacing: -0.01em; color: var(--bone); }
          .lp-satin-title em { font-style: italic; color: var(--silver); }
          .lp-satin-acronym { font-family: var(--serif-body); font-size: 13.5px; font-style: italic; color: var(--stone); margin-top: 12px; }
          .lp-satin-intro { font-family: var(--serif-body); font-size: 15.5px; line-height: 1.88; color: var(--stone); align-self: end; }
          .lp-layers { display: flex; flex-direction: column; border-top: 1px solid rgba(253,250,246,0.07); }
          .lp-layer-item { display: grid; grid-template-columns: 80px 1fr 1.4fr; gap: 0; border-bottom: 1px solid rgba(253,250,246,0.06); transition: background 0.25s; }
          .lp-layer-item:hover { background: rgba(253,250,246,0.02); }
          .lp-layer-num-col { padding: 36px 0; display: flex; align-items: flex-start; border-right: 1px solid rgba(253,250,246,0.06); }
          .lp-layer-num { font-family: var(--serif-display); font-size: 13px; font-weight: 300; letter-spacing: 0.15em; color: var(--ash); }
          .lp-layer-name-col { padding: 36px 40px; border-right: 1px solid rgba(253,250,246,0.06); }
          .lp-layer-name { font-family: var(--serif-display); font-size: 20px; font-weight: 300; color: var(--bone); margin-bottom: 6px; }
          .lp-layer-sub { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--stone); }
          .lp-layer-desc-col { padding: 36px 0 36px 48px; }
          .lp-layer-desc { font-family: var(--serif-body); font-size: 14.5px; line-height: 1.8; color: var(--stone); }
          .lp-tech-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
          .lp-tech-tag { font-family: var(--sans-label); font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ash); border: 1px solid rgba(253,250,246,0.08); padding: 4px 10px; }
          /* JOURNEY */
          .lp-journey { background: var(--cream); border-top: 1px solid rgba(12,11,10,0.06); border-bottom: 1px solid rgba(12,11,10,0.06); }
          .lp-journey-inner { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); }
          .lp-journey-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 64px; border-left: 1px solid rgba(12,11,10,0.08); border-top: 1px solid rgba(12,11,10,0.08); }
          .lp-journey-step { padding: 44px 32px 44px 36px; border-right: 1px solid rgba(12,11,10,0.08); border-bottom: 1px solid rgba(12,11,10,0.08); transition: background 0.25s; }
          .lp-journey-step:hover { background: var(--bone); }
          .lp-step-num { font-family: var(--serif-display); font-size: 44px; font-weight: 300; color: var(--linen); line-height: 1; margin-bottom: 20px; letter-spacing: -0.02em; }
          .lp-step-title { font-family: var(--serif-display); font-size: 20px; font-weight: 400; color: var(--ink); margin-bottom: 14px; }
          .lp-step-body { font-family: var(--serif-body); font-size: 14px; line-height: 1.82; color: var(--stone); }
          /* TOKENOMICS */
          .lp-tokenomics { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); }
          .lp-veld-grid { display: grid; grid-template-columns: 1.1fr 1px 0.9fr; gap: 0; }
          .lp-veld-left { padding-right: 72px; }
          .lp-veld-right { padding-left: 72px; }
          .lp-veld-div { background: rgba(12,11,10,0.08); }
          .lp-veld-headline { font-family: var(--serif-display); font-size: clamp(40px, 4.5vw, 66px); font-weight: 300; line-height: 1.08; letter-spacing: -0.012em; color: var(--ink); margin-bottom: 32px; }
          .lp-veld-headline em { font-style: italic; color: var(--ash); }
          .lp-token-params { border: 1px solid rgba(12,11,10,0.09); margin-bottom: 40px; }
          .lp-token-param { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 14px 20px; border-bottom: 1px solid rgba(12,11,10,0.06); }
          .lp-token-param:last-child { border-bottom: none; }
          .lp-tp-key { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--silver); flex-shrink: 0; }
          .lp-tp-val { font-family: var(--serif-body); font-size: 14px; color: var(--ash); text-align: right; }
          .lp-flywheel-title { font-family: var(--serif-display); font-size: 28px; font-weight: 300; color: var(--ink); margin-bottom: 32px; }
          .lp-flywheel-items { display: flex; flex-direction: column; gap: 0; border-top: 1px solid rgba(12,11,10,0.08); }
          .lp-flywheel-item { padding: 28px 0; border-bottom: 1px solid rgba(12,11,10,0.08); }
          .lp-fi-label { font-family: var(--sans-label); font-size: 8.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--silver); margin-bottom: 8px; }
          .lp-fi-title { font-family: var(--serif-display); font-size: 18px; font-weight: 400; color: var(--ink); margin-bottom: 8px; }
          .lp-fi-body { font-family: var(--serif-body); font-size: 14px; line-height: 1.78; color: var(--stone); }
          .lp-phases { margin-top: 40px; display: grid; grid-template-columns: repeat(5, 1fr); border-left: 1px solid rgba(12,11,10,0.08); border-top: 1px solid rgba(12,11,10,0.08); }
          .lp-phase-cell { padding: 24px 18px; border-right: 1px solid rgba(12,11,10,0.08); border-bottom: 1px solid rgba(12,11,10,0.08); }
          .lp-phase-name { font-family: var(--serif-display); font-size: 14px; font-weight: 400; color: var(--ink); margin-bottom: 6px; }
          .lp-phase-cap { font-family: var(--sans-label); font-size: 9px; letter-spacing: 0.15em; color: var(--stone); }
          /* GOVERNANCE */
          .lp-governance { background: var(--white); border-top: 1px solid rgba(12,11,10,0.06); border-bottom: 1px solid rgba(12,11,10,0.06); }
          .lp-governance-inner { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); }
          .lp-gov-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid rgba(12,11,10,0.08); border-left: 1px solid rgba(12,11,10,0.08); margin-top: 64px; }
          .lp-gov-card { padding: 52px 44px; border-right: 1px solid rgba(12,11,10,0.08); border-bottom: 1px solid rgba(12,11,10,0.08); }
          .lp-gov-card-num { font-family: var(--serif-display); font-size: 10px; font-weight: 300; letter-spacing: 0.28em; color: var(--silver); margin-bottom: 24px; }
          .lp-gov-card-title { font-family: var(--serif-display); font-size: 24px; font-weight: 300; color: var(--ink); margin-bottom: 18px; }
          .lp-gov-card-body { font-family: var(--serif-body); font-size: 15px; line-height: 1.82; color: var(--stone); margin-bottom: 24px; }
          .lp-gov-formula { background: var(--cream); padding: 20px 22px; border-left: 2px solid var(--linen); margin-top: 20px; }
          .lp-gov-formula code { font-family: var(--sans-label); font-size: 11px; letter-spacing: 0.05em; color: var(--ash); line-height: 1.7; }
          /* SECURITY */
          .lp-security { background: var(--ink); color: var(--bone); }
          .lp-security-inner { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); }
          .lp-security-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 64px; border-left: 1px solid rgba(253,250,246,0.07); border-top: 1px solid rgba(253,250,246,0.07); }
          .lp-sec-card { padding: 44px 36px; border-right: 1px solid rgba(253,250,246,0.07); border-bottom: 1px solid rgba(253,250,246,0.07); transition: background 0.25s; }
          .lp-sec-card:hover { background: rgba(253,250,246,0.02); }
          .lp-sec-card-label { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--stone); margin-bottom: 18px; }
          .lp-sec-card-title { font-family: var(--serif-display); font-size: 22px; font-weight: 300; color: var(--bone); margin-bottom: 16px; }
          .lp-sec-card-body { font-family: var(--serif-body); font-size: 14px; line-height: 1.8; color: var(--stone); }
          /* PULL QUOTE */
          .lp-pq-wrap { padding: 100px var(--gutter); max-width: var(--mw); margin: 0 auto; display: grid; grid-template-columns: 60px 1fr 60px; gap: 20px; align-items: center; }
          .lp-pq-rule { height: 1px; background: rgba(12,11,10,0.09); }
          .lp-pq-blockquote { font-family: var(--serif-display); font-size: clamp(22px, 2.8vw, 36px); font-weight: 300; font-style: italic; line-height: 1.48; color: var(--ink); margin-bottom: 22px; letter-spacing: -0.005em; text-align: center; }
          .lp-pq-cite { font-family: var(--sans-label); font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--silver); font-style: normal; display: block; text-align: center; }
          /* ROADMAP */
          .lp-roadmap { background: var(--parchment); border-top: 1px solid rgba(12,11,10,0.07); border-bottom: 1px solid rgba(12,11,10,0.07); }
          .lp-roadmap-inner { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); }
          .lp-roadmap-track { margin-top: 64px; display: flex; flex-direction: column; border-top: 1px solid rgba(12,11,10,0.09); }
          .lp-roadmap-phase { display: grid; grid-template-columns: 200px 1fr; border-bottom: 1px solid rgba(12,11,10,0.09); transition: background 0.2s; }
          .lp-roadmap-phase:hover { background: var(--cream); }
          .lp-phase-meta { padding: 40px 0; border-right: 1px solid rgba(12,11,10,0.09); display: flex; flex-direction: column; gap: 8px; }
          .lp-phase-tag { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--silver); }
          .lp-phase-title { font-family: var(--serif-display); font-size: 22px; font-weight: 300; color: var(--ink); }
          .lp-phase-status { display: inline-flex; align-items: center; gap: 7px; font-family: var(--sans-label); font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--stone); margin-top: 4px; }
          .lp-phase-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--ink); }
          .lp-phase-dot-active { animation: lpPulse 2s ease-in-out infinite; }
          .lp-phase-content { padding: 40px 0 40px 52px; }
          .lp-phase-milestones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 36px; }
          .lp-milestone { font-family: var(--serif-body); font-size: 14px; line-height: 1.6; color: var(--stone); display: flex; align-items: baseline; gap: 10px; }
          .lp-milestone::before { content: '—'; color: var(--linen); flex-shrink: 0; font-family: var(--serif-display); }
          /* TEAM */
          .lp-team { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); }
          .lp-team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 64px; border-left: 1px solid rgba(12,11,10,0.08); border-top: 1px solid rgba(12,11,10,0.08); }
          .lp-team-wide { grid-column: span 3; background: var(--ink); color: var(--bone); display: grid; grid-template-columns: 1fr 1.5fr; gap: 56px; align-items: center; padding: 44px 36px; border-right: 1px solid rgba(12,11,10,0.08); border-bottom: 1px solid rgba(12,11,10,0.08); }
          .lp-team-org-name { font-family: var(--serif-display); font-size: 32px; font-weight: 300; color: var(--bone); letter-spacing: 0.05em; margin-bottom: 14px; }
          .lp-team-org-body { font-family: var(--serif-body); font-size: 15px; line-height: 1.85; color: var(--stone); }
          .lp-team-discipline { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--silver); margin-bottom: 8px; }
          .lp-team-area-body { font-family: var(--serif-body); font-size: 13.5px; line-height: 1.8; color: var(--stone); }
          /* CONTACT */
          .lp-contact { background: var(--ink); color: var(--bone); }
          .lp-contact-inner { max-width: var(--mw); margin: 0 auto; padding: 120px var(--gutter); display: grid; grid-template-columns: 1fr 1px 1fr; gap: 80px; }
          .lp-contact-div { background: rgba(253,250,246,0.07); }
          .lp-contact-headline { font-family: var(--serif-display); font-size: clamp(32px, 3.5vw, 52px); font-weight: 300; line-height: 1.14; letter-spacing: -0.01em; color: var(--bone); margin-bottom: 28px; }
          .lp-contact-headline em { font-style: italic; color: var(--silver); }
          .lp-contact-body { font-family: var(--serif-body); font-size: 15px; line-height: 1.85; color: var(--stone); max-width: 380px; margin-bottom: 52px; }
          .lp-contact-details { display: flex; flex-direction: column; gap: 22px; }
          .lp-cd-label { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--stone); margin-bottom: 5px; }
          .lp-cd-val { font-family: var(--serif-body); font-size: 15px; color: var(--silver); }
          .lp-contact-form { display: flex; flex-direction: column; gap: 30px; }
          .lp-form-field { display: flex; flex-direction: column; gap: 10px; }
          .lp-form-label { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--stone); }
          .lp-form-input, .lp-form-select, .lp-form-textarea { font-family: var(--serif-body); font-size: 15px; color: var(--bone); background: transparent; border: none; border-bottom: 1px solid rgba(253,250,246,0.15); padding: 10px 0; outline: none; width: 100%; transition: border-color 0.2s; resize: none; -webkit-appearance: none; appearance: none; }
          .lp-form-select option { background: var(--ink); }
          .lp-form-input::placeholder, .lp-form-textarea::placeholder { color: var(--ash); font-style: italic; }
          .lp-form-input:focus, .lp-form-select:focus, .lp-form-textarea:focus { border-bottom-color: rgba(253,250,246,0.5); }
          .lp-form-submit { align-self: flex-start; font-family: var(--sans-label); font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink); background: var(--bone); border: none; padding: 17px 40px; cursor: pointer; margin-top: 8px; transition: background 0.2s, transform 0.18s; }
          .lp-form-submit:hover { background: var(--parchment); transform: translateY(-1px); }
          /* FOOTER */
          .lp-footer { background: var(--ink-soft); color: var(--stone); border-top: 1px solid rgba(253,250,246,0.05); }
          .lp-footer-inner { max-width: var(--mw); margin: 0 auto; padding: 72px var(--gutter) 48px; }
          .lp-footer-top { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 56px; margin-bottom: 60px; padding-bottom: 56px; border-bottom: 1px solid rgba(253,250,246,0.06); }
          .lp-footer-wordmark { font-family: var(--serif-display); font-size: 20px; font-weight: 300; letter-spacing: 0.38em; text-transform: uppercase; color: var(--bone); margin-bottom: 8px; }
          .lp-footer-protocol-line { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ash); margin-bottom: 20px; }
          .lp-footer-tagline { font-family: var(--serif-body); font-size: 14px; font-style: italic; line-height: 1.75; color: var(--ash); max-width: 240px; }
          .lp-footer-col-title { font-family: var(--sans-label); font-size: 8.5px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--stone); margin-bottom: 22px; }
          .lp-footer-links { list-style: none; display: flex; flex-direction: column; gap: 12px; }
          .lp-footer-links a { font-family: var(--serif-body); font-size: 14px; color: var(--ash); text-decoration: none; transition: color 0.2s; }
          .lp-footer-links a:hover { color: var(--bone); }
          .lp-footer-bottom { display: flex; align-items: center; justify-content: space-between; }
          .lp-footer-legal { font-family: var(--sans-label); font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-mid); }
          .lp-footer-badges { display: flex; align-items: center; gap: 12px; }
          .lp-f-badge { font-family: var(--sans-label); font-size: 7.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ash); border: 1px solid rgba(253,250,246,0.06); padding: 5px 11px; }
          /* ANIMATIONS */
          @keyframes lpFadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
          @keyframes lpPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.65); } }
          @keyframes lpMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          /* RESPONSIVE */
          @media (max-width: 1100px) {
            .lp-hero-body { grid-template-columns: 1fr; }
            .lp-hero-left { border-right: none; border-bottom: var(--col-gap); padding: 80px 0 60px; }
            .lp-hero-right { padding: 60px 0 80px; }
            .lp-hero-divider { display: none; }
            .lp-poba-grid { grid-template-columns: 1fr; gap: 56px; }
            .lp-poba-div { display: none; }
            .lp-poba-right, .lp-poba-left { padding: 0; }
            .lp-action-grid { grid-template-columns: repeat(2, 1fr); }
            .lp-formula { grid-template-columns: 1fr; }
            .lp-formula-sep { display: none; }
            .lp-formula-col { padding: 32px 0 0; border-top: 1px solid rgba(253,250,246,0.07); }
            .lp-formula-col:first-child { border-top: none; padding-top: 0; }
            .lp-satin-header { grid-template-columns: 1fr; }
            .lp-layer-item { grid-template-columns: 60px 1fr; }
            .lp-layer-desc-col { display: none; }
            .lp-journey-steps { grid-template-columns: repeat(2, 1fr); }
            .lp-veld-grid { grid-template-columns: 1fr; }
            .lp-veld-div { display: none; }
            .lp-veld-left, .lp-veld-right { padding: 0; }
            .lp-phases { grid-template-columns: repeat(3, 1fr); }
            .lp-security-grid { grid-template-columns: repeat(2, 1fr); }
            .lp-gov-grid { grid-template-columns: 1fr; }
            .lp-roadmap-phase { grid-template-columns: 160px 1fr; }
            .lp-phase-milestones { grid-template-columns: 1fr; }
            .lp-team-grid { grid-template-columns: 1fr 1fr; }
            .lp-team-wide { grid-column: span 2; }
            .lp-contact-inner { grid-template-columns: 1fr; }
            .lp-contact-div { display: none; }
            .lp-footer-top { grid-template-columns: 1fr 1fr; gap: 36px; }
            .lp-pq-wrap { grid-template-columns: 30px 1fr 30px; }
          }
          @media (max-width: 680px) {
            :root { --gutter: 20px; }
            .lp-nav { padding: 0 20px; }
            .lp-nav-links { display: none; }
            .lp-action-grid { grid-template-columns: 1fr; }
            .lp-journey-steps { grid-template-columns: 1fr; }
            .lp-phases { grid-template-columns: 1fr 1fr; }
            .lp-security-grid { grid-template-columns: 1fr; }
            .lp-roadmap-phase { grid-template-columns: 1fr; }
            .lp-phase-meta { border-right: none; padding-bottom: 0; }
            .lp-phase-content { padding: 0 0 32px; }
            .lp-team-grid { grid-template-columns: 1fr; }
            .lp-team-wide { grid-column: span 1; grid-template-columns: 1fr; }
            .lp-footer-top { grid-template-columns: 1fr; }
            .lp-footer-bottom { flex-direction: column; gap: 20px; align-items: flex-start; }
            .lp-stat-row { grid-template-columns: 1fr; }
            .lp-stat-cell:last-child { padding-left: 0; border-top: 1px solid rgba(12,11,10,0.08); }
          }
        ` }} />
      </Head>

      {/* NAV */}
      <nav className="lp-nav">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <a href="#" className="lp-nav-wordmark">Haven</a>
          <span className="lp-nav-version">v2.0 · 2025</span>
        </div>
        <ul className="lp-nav-links">
          <li><a href="#poba">Protocol</a></li>
          <li><a href="#satin">SATIN Oracle</a></li>
          <li><a href="#tokenomics">VELD</a></li>
          <li><a href="#governance">Governance</a></li>
          <li><a href="#roadmap">Roadmap</a></li>
          <li><a href="#team">StoneBridge</a></li>
        </ul>
        <button onClick={goToApp} className="lp-nav-btn">Access Protocol</button>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-body">
          <div className="lp-hero-left">
            <div className="lp-hero-eyebrow">
              <span className="lp-label-caps">StoneBridge Intelligence · Chain ID 777000 · BridgeStone L1</span>
            </div>
            <h1 className="lp-hero-headline">Humanity<br />Action<br /><em>Verification</em><br />& Economic<br />Network</h1>
            <p className="lp-hero-subhead">HAVEN Protocol · VELD · PoBA</p>
            <p className="lp-hero-desc">A decentralised blockchain protocol that converts real-world humanitarian actions into on-chain economic value through a mechanism that has never existed before: <em>Proof of Beneficial Action.</em></p>
            <div className="lp-hero-actions">
              <button onClick={goToApp} className="lp-btn-primary">Access the Protocol</button>
              <a href="#poba" className="lp-btn-outline">Explore the Protocol</a>
            </div>
          </div>
          <div className="lp-hero-divider"></div>
          <div className="lp-hero-right">
            <div className="lp-chain-badge">
              <div className="lp-chain-dot"></div>
              <span className="lp-label-caps">BridgeStone L1 · Active</span>
            </div>
            <div className="lp-hero-stats">
              {HERO_STATS.map((row, i) => (
                <div key={i} className="lp-stat-row">
                  {row.map(s => (
                    <div key={s.l} className="lp-stat-cell">
                      <div className="lp-stat-label">{s.l}</div>
                      <div className="lp-stat-num">{s.n}</div>
                      <div className="lp-stat-note">{s.note}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="lp-key-facts">
              <div className="lp-key-facts-header"><span className="lp-label-caps">Protocol Parameters</span></div>
              {PROTOCOL_FACTS.map(([k, v]) => (
                <div key={k} className="lp-key-fact-row">
                  <span className="lp-kf-key">{k}</span>
                  <span className="lp-kf-val">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lp-marquee">
          <div className="lp-marquee-track">
            {[0, 1].map(i => (
              <span key={i}>
                {MARQUEE_TEXTS.map(t => (
                  <span key={t} className="lp-marquee-item">{t}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="lp-problem">
        <div className="lp-problem-inner">
          <div><div className="lp-problem-label"><span className="lp-label-caps">The Problem</span></div></div>
          <div>
            <p className="lp-problem-quote">&ldquo;Trillions of dollars flow through humanitarian channels annually — yet less than 40% reaches verified impact. Goodness has no economic value. Until now.&rdquo;</p>
            <div className="lp-problem-cols">
              {PROBLEMS.map(([t, b]) => (
                <div key={t}><div className="lp-problem-col-title">{t}</div><p className="lp-problem-col-body">{b}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* POBA */}
      <section className="lp-poba" id="poba">
        <div className="lp-sec-header"><h2 className="lp-sec-title">Proof of <em>Beneficial Action</em></h2><span className="lp-label-caps">Core Innovation</span></div>
        <div className="lp-poba-grid">
          <div className="lp-poba-left">
            <h3 className="lp-poba-title">A new consensus<br /><em>primitive</em></h3>
            <p className="lp-poba-body">PoBA is a novel cryptographic consensus mechanism that converts verified humanitarian actions into on-chain economic events. Unlike Proof of Work or Proof of Stake, PoBA requires proof of real-world beneficial impact as the basis for token issuance.</p>
            <div className="lp-poba-hl"><p>Every VELD token in circulation is backed by a cryptographically verified act of human goodness — not computational waste or capital lockup.</p></div>
            <p className="lp-poba-body">The mechanism combines AI visual verification, GPS attestation, behavioral fingerprinting, and community consensus to produce tamper-proof impact proofs stored permanently on the BridgeStone L1.</p>
          </div>
          <div className="lp-poba-div"></div>
          <div className="lp-poba-right">
            <h3 className="lp-poba-title">Eight action<br /><em>categories</em></h3>
            <p className="lp-poba-body">HAVEN recognises eight primary humanitarian action categories, each mapped to specific UN Sustainable Development Goals. Each action type carries a base impact score calibrated to difficulty, reach, and urgency.</p>
            <p className="lp-poba-body">The SATIN Oracle AI pipeline evaluates submissions across these categories using multi-phase visual examination, claim cross-referencing, and temporal behavioral analysis.</p>
          </div>
        </div>
        <div className="lp-action-grid">
          {ACTION_CATEGORIES.map(([c, n, s]) => (
            <div key={c} className="lp-action-cell"><span className="lp-action-code">{c}</span><div className="lp-action-name">{n}</div><div className="lp-action-sdg">{s}</div></div>
          ))}
        </div>
        <div className="lp-formula">
          {POBA_FORMULA.map(([num, name, desc], i) => (
            <React.Fragment key={num}>
              {i > 0 && <div className="lp-formula-sep"></div>}
              <div className="lp-formula-col">
                <div className="lp-formula-layer-num">{num}</div>
                <div className="lp-formula-layer-name">{name}</div>
                <div className="lp-formula-desc">{desc}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* SATIN */}
      <section className="lp-satin" id="satin">
        <div className="lp-satin-inner">
          <div className="lp-satin-header">
            <div><h2 className="lp-satin-title">SATIN<br /><em>Oracle</em></h2><div className="lp-satin-acronym">Systematic Action Truth &amp; Integrity Network</div></div>
            <p className="lp-satin-intro">An eight-layer AI verification pipeline that independently examines photographic evidence, cross-references volunteer claims, detects behavioral anomalies, and produces cryptographically signed impact verdicts — without human intervention.</p>
          </div>
          <div className="lp-layers">
            {LAYERS.map(([num, name, sub, desc, tags]) => (
              <div key={num} className="lp-layer-item">
                <div className="lp-layer-num-col"><span className="lp-layer-num">{num}</span></div>
                <div className="lp-layer-name-col">
                  <div className="lp-layer-name">{name}</div>
                  <div className="lp-layer-sub">{sub}</div>
                </div>
                <div className="lp-layer-desc-col">
                  <div className="lp-layer-desc">{desc}</div>
                  <div className="lp-tech-tags">
                    {tags.map(t => <span key={t} className="lp-tech-tag">{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="lp-journey">
        <div className="lp-journey-inner">
          <div className="lp-sec-header"><h2 className="lp-sec-title">The Volunteer <em>Journey</em></h2><span className="lp-label-caps">Four Steps</span></div>
          <div className="lp-journey-steps">
            {JOURNEY_STEPS.map(([n, t, b]) => (
              <div key={n} className="lp-journey-step"><div className="lp-step-num">{n}</div><div className="lp-step-title">{t}</div><p className="lp-step-body">{b}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* TOKENOMICS */}
      <section className="lp-tokenomics" id="tokenomics">
        <div className="lp-sec-header"><h2 className="lp-sec-title">VELD <em>Tokenomics</em></h2><span className="lp-label-caps">Living Economy</span></div>
        <div className="lp-veld-grid">
          <div className="lp-veld-left">
            <h3 className="lp-veld-headline">The only token<br />backed by <em>goodness</em></h3>
            <div className="lp-token-params">
              {TOKEN_PARAMS.map(([k, v]) => (
                <div key={k} className="lp-token-param"><span className="lp-tp-key">{k}</span><span className="lp-tp-val">{v}</span></div>
              ))}
            </div>
            <div className="lp-phases">
              {GENESIS_PHASES.map(([n, c]) => (
                <div key={n} className="lp-phase-cell"><div className="lp-phase-name">{n}</div><div className="lp-phase-cap">{c}</div></div>
              ))}
            </div>
          </div>
          <div className="lp-veld-div"></div>
          <div className="lp-veld-right">
            <div className="lp-flywheel-title">The Impact Flywheel</div>
            <div className="lp-flywheel-items">
              {FLYWHEEL_STEPS.map(([l, t, b]) => (
                <div key={l} className="lp-flywheel-item"><div className="lp-fi-label">{l}</div><div className="lp-fi-title">{t}</div><p className="lp-fi-body">{b}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GOVERNANCE */}
      <section className="lp-governance" id="governance">
        <div className="lp-governance-inner">
          <div className="lp-sec-header"><h2 className="lp-sec-title">Quadratic <em>Governance</em></h2><span className="lp-label-caps">DAO Architecture</span></div>
          <div className="lp-gov-grid">
            {GOV_CARDS.map(([n, t, b, f]) => (
              <div key={n} className="lp-gov-card"><div className="lp-gov-card-num">{n}</div><div className="lp-gov-card-title">{t}</div><p className="lp-gov-card-body">{b}</p><div className="lp-gov-formula"><code style={{ whiteSpace: "pre-line" }}>{f}</code></div></div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="lp-security">
        <div className="lp-security-inner">
          <div className="lp-sec-header" style={{ borderBottomColor: "rgba(253,250,246,0.07)" }}>
            <h2 className="lp-sec-title" style={{ color: "var(--bone)" }}>Security <em style={{ color: "var(--silver)" }}>Architecture</em></h2>
            <span className="lp-label-caps">Multi-Layer Defence</span>
          </div>
          <div className="lp-security-grid">
            {SECURITY_ITEMS.map(([l, t, b]) => (
              <div key={l} className="lp-sec-card"><div className="lp-sec-card-label">{l}</div><div className="lp-sec-card-title">{t}</div><p className="lp-sec-card-body">{b}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* PULL QUOTE */}
      <div className="lp-pq-wrap">
        <div className="lp-pq-rule"></div>
        <div>
          <blockquote className="lp-pq-blockquote">&ldquo;We did not build a charity platform. We built a primitive — a new economic layer where human goodness becomes the scarcest and most valuable resource in the network.&rdquo;</blockquote>
          <cite className="lp-pq-cite">StoneBridge Intelligence · HAVEN Protocol v2.0</cite>
        </div>
        <div className="lp-pq-rule"></div>
      </div>

      {/* ROADMAP */}
      <section className="lp-roadmap" id="roadmap">
        <div className="lp-roadmap-inner">
          <div className="lp-sec-header"><h2 className="lp-sec-title">Protocol <em>Roadmap</em></h2><span className="lp-label-caps">Development Phases</span></div>
          <div className="lp-roadmap-track">
            {ROADMAP_PHASES.map(([tag, title, status, milestones]) => (
              <div key={tag} className="lp-roadmap-phase">
                <div className="lp-phase-meta">
                  <div className="lp-phase-tag">{tag}</div>
                  <div className="lp-phase-title">{title}</div>
                  <div className="lp-phase-status"><span className={`lp-phase-dot ${status === "active" ? "lp-phase-dot-active" : ""}`}></span>{status}</div>
                </div>
                <div className="lp-phase-content">
                  <div className="lp-phase-milestones">{milestones.map(m => <div key={m} className="lp-milestone">{m}</div>)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="lp-team" id="team">
        <div className="lp-sec-header"><h2 className="lp-sec-title">StoneBridge <em>Intelligence</em></h2><span className="lp-label-caps">Protocol Architects</span></div>
        <div className="lp-team-grid">
          <div className="lp-team-wide">
            <div><div className="lp-team-org-name">StoneBridge Intelligence</div><p className="lp-team-org-body">The research and engineering organisation behind the HAVEN Protocol. StoneBridge operates at the intersection of decentralised systems, AI verification, and humanitarian technology — building infrastructure that converts human virtue into economic signal.</p></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px" }}>
              {TEAM_DISCIPLINES.map(([d, b]) => (
                <div key={d}><div className="lp-team-discipline">{d}</div><div className="lp-team-area-body">{b}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="lp-contact" id="contact">
        <div className="lp-contact-inner">
          <div>
            <div className="lp-label-caps" style={{ color: "var(--stone)", marginBottom: "20px" }}>Protocol Participation</div>
            <h2 className="lp-contact-headline">Join<br /><em>The Protocol</em></h2>
            <p className="lp-contact-body">HAVEN accepts volunteer registrations, NGO partnership inquiries, CSR integration proposals, and oracle node applications. All qualified participants are onboarded through the SovereignID registration system with community vouching.</p>
            <div className="lp-contact-details">
              {CONTACT_INFOS.map(([k, v]) => (
                <div key={k}><div className="lp-cd-label">{k}</div><div className="lp-cd-val">{v}</div></div>
              ))}
            </div>
            <div style={{ marginTop: "40px", paddingTop: "32px", borderTop: "1px solid rgba(253,250,246,0.1)" }}>
              <div className="lp-label-caps" style={{ color: "var(--stone)", marginBottom: "16px" }}>Ready to participate?</div>
              <button onClick={goToApp} style={{ fontFamily: "var(--sans-label)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink)", background: "var(--bone)", border: "none", padding: "18px 48px", cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--parchment)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bone)" }}>
                Access the Protocol
              </button>
            </div>
          </div>
          <div className="lp-contact-div"></div>
          <form className="lp-contact-form" onSubmit={e => e.preventDefault()}>
            {CONTACT_INPUTS.map(([label, type, ph]) => (
              <div key={String(label)} className="lp-form-field">
                <label className="lp-form-label">{String(label)}</label>
                <input className="lp-form-input" type={String(type)} placeholder={String(ph)} />
              </div>
            ))}
            <div className="lp-form-field">
              <label className="lp-form-label">Participation Type</label>
              <select className="lp-form-select" defaultValue="">
                <option value="" disabled>Select participation type</option>
                {PARTICIPATION_TYPES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="lp-form-field"><label className="lp-form-label">Message</label><textarea className="lp-form-textarea" rows={4} placeholder="Describe your intended participation…" /></div>
            <button className="lp-form-submit" type="submit">Submit Application</button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div><div className="lp-footer-wordmark">Haven</div><div className="lp-footer-protocol-line">Humanity Action Verification & Economic Network</div><p className="lp-footer-tagline">A decentralised protocol where every token is backed by a verified act of human goodness.</p></div>
            {FOOTER_NAV.map(([title, links]) => (
              <div key={title}>
                <div className="lp-footer-col-title">{title}</div>
                <ul className="lp-footer-links">
                  {links.map(([href, label]) => (
                    <li key={label}><a href={href}>{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="lp-footer-bottom">
            <span className="lp-footer-legal">© 2025 StoneBridge Intelligence. Confidential For Informational Purposes Only. Not financial advice.</span>
            <div className="lp-footer-badges">{["HAVEN v2.0", "Chain ID 777000", "BridgeStone L1", "Solidity 0.8.20"].map(b => <span key={b} className="lp-f-badge">{b}</span>)}</div>
          </div>
        </div>
      </footer>
    </>
  );
}

type LayerData = readonly [string, string, string, string, readonly string[]];
type RoadmapPhase = readonly [string, string, string, readonly string[]];
type FooterCol = readonly [string, readonly (readonly [string, string])[]];

const HERO_STATS = [
  [{ l: "Chain ID", n: "777000", note: "Sovereign L1" }, { l: "Native Token", n: "VELD", note: "Proof-backed" }],
  [{ l: "Oracle Layers", n: "8", note: "SATIN AI pipeline" }, { l: "Action Types", n: "8+", note: "SDG-aligned" }]
] as const;

const PROTOCOL_FACTS = [
  ["Consensus", "Avalanche PoS"],
  ["Identity", "SovereignID · Social Graph"],
  ["Verification", "YOLOv8 · LLaVA · zk-proof"],
  ["Governance", "Quadratic Voting DAO"],
  ["Status", "Genesis Phase · Open"]
] as const;

const MARQUEE_TEXTS = [
  "Proof of Beneficial Action", "SATIN Oracle", "SovereignID", "VELD Token", "Quadratic Governance",
  "CrisisFund", "BridgeStone L1", "Anti-Sybil Layer", "ZK Proofs", "Impact Scoring",
  "Cross-Temporal Chain", "Behavioral Fingerprint"
] as const;

const PROBLEMS = [
  ["Accountability Gap", "Traditional aid systems lack verifiable, on-chain proof that humanitarian actions were performed. Donors cannot confirm their resources created real impact."],
  ["No Economic Signal", "Beneficial actions generate no economic reward for actors. The market has no mechanism to price human goodness, creating zero incentive alignment."],
  ["Sybil Vulnerability", "Existing reputation systems are trivially gamed. Without biometric binding and social vouching, any actor can fabricate humanitarian credentials at scale."],
  ["Opacity by Design", "NGO reporting operates on annual cycles with limited auditability. Real-time, cryptographically verifiable impact data does not exist in any current system."]
] as const;

const ACTION_CATEGORIES = [
  ["ACT-001", "Food Distribution", "SDG 2 · Zero Hunger"],
  ["ACT-002", "Medical Aid", "SDG 3 · Good Health"],
  ["ACT-003", "Shelter Construction", "SDG 11 · Sustainable Cities"],
  ["ACT-004", "Education Session", "SDG 4 · Quality Education"],
  ["ACT-005", "Disaster Relief", "SDG 13 · Climate Action"],
  ["ACT-006", "Clean Water Project", "SDG 6 · Clean Water"],
  ["ACT-007", "Mental Health Support", "SDG 3 · Good Health"],
  ["ACT-008", "Environmental Action", "SDG 15 · Life on Land"]
] as const;

const POBA_FORMULA = [
  ["Layer I", "Visual Proof", "YOLOv8 object detection + LLaVA visual witness examination. Phase 1 sees image without claims. Phase 2 cross-examines claims against visual evidence."],
  ["Layer II", "Anti-Sybil", "Behavioral fingerprinting, GPS temporal analysis, device binding, and social graph vouching prevent identity fabrication at any scale."],
  ["Layer III", "On-Chain Proof", "zk-proof hash, oracle signature, nonce, and expiry window produce a tamper-proof impact record. Smart contract validates and distributes VELD atomically."]
] as const;

const LAYERS: readonly LayerData[] = [
  ["L1", "Proof of Benevolence", "CV + Fraud Detection", "YOLOv8 object detection with ELA analysis, perceptual hashing, and EXIF forensics. Detects duplicates, screenshots, and AI-generated images.", ["YOLOv8", "ELA", "pHash", "EXIF"]],
  ["L2", "Parameter Integrity", "3-Phase AI Cross-Examination", "Phase 1: LLaVA visual witness (blind). Phase 2: Cross-examination of claims vs. evidence. Phase 3: Synthesis verdict with claim accuracy score.", ["LLaVA", "Cross-Exam", "Claim Accuracy"]],
  ["L3", "Anti-Sybil", "Behavioral Fingerprinting", "Temporal GPS analysis, submission velocity tracking, device fingerprint binding, and cross-temporal evidence chaining for repeat-actor validation.", ["GPS Temporal", "Velocity", "Device Bind"]],
  ["L4", "Community Consensus", "Decentralised Review", "Borderline submissions enter community deliberation. CHAMPION-ranked validators vote with reputation-weighted quadratic power.", ["Quadratic Vote", "Reputation", "DAO"]],
  ["L5", "Crisis Oracle", "Geo Multiplier", "Real-time crisis zone detection applies urgency multipliers to submissions from active disaster areas.", ["Crisis Zones", "Multiplier", "Geo"]],
  ["L6", "Impact Scoring", "Multi-Factor Formula", "Combines urgency, difficulty, reach, and authenticity weights into a 0–100 impact score.", ["Scoring", "Weights", "Non-linear"]],
  ["L7", "ZK Proof", "Cryptographic Attestation", "Oracle signs event hash, volunteer address, impact score, and token reward with a time-bound nonce.", ["zk-proof", "Oracle Sig", "On-chain"]],
  ["L8", "Reputation Ledger", "Cumulative Identity", "Each verified action updates the volunteer's on-chain reputation score determining DAO voting weight and governance rank.", ["Reputation", "DAO Weight", "Ledger"]]
] as const;

const JOURNEY_STEPS = [
  ["01", "Establish Identity", "Register your SovereignID on-chain via the social graph vouching system. Three verified community members attest to your identity. Biometric hash binds your personhood to your wallet permanently."],
  ["02", "Perform Impact", "Conduct a verified humanitarian action — food distribution, medical aid, shelter construction, disaster relief, or any of the eight recognised action categories. Document with photographic evidence."],
  ["03", "Submit Proof", "Upload your evidence through the HAVEN app. The SATIN Oracle pipeline examines your photograph independently, then cross-references your account. GPS coordinates and timestamp are cryptographically bound."],
  ["04", "Receive VELD", "Upon oracle verification, a zk-proof is generated and submitted to the BenevolenceVault smart contract. VELD tokens are distributed atomically. Your reputation score is updated on the Ledger."]
] as const;

const TOKEN_PARAMS = [
  ["Token Name", "VELD"], ["Supply Model", "Proof-backed · No pre-mine"],
  ["Issuance", "Only via verified impact actions"],
  ["Burn Mechanism", "1% transaction fee → CrisisFund"],
  ["Governance Weight", "Reputation-adjusted quadratic"],
  ["Smart Contract", "Solidity 0.8.20 · BridgeStone L1"]
] as const;

const GENESIS_PHASES = [
  ["Genesis", "Seed issuance"], ["Growth", "Volunteer expansion"],
  ["Scale", "NGO integration"], ["Mature", "Institutional"],
  ["Sovereign", "Full DAO"]
] as const;

const FLYWHEEL_STEPS = [
  ["Step 01", "Impact Action", "Volunteer performs verified humanitarian action. SATIN Oracle issues zk-proof. VELD minted and distributed."],
  ["Step 02", "Reputation Accrual", "Each verified action increases on-chain reputation score. Higher rank unlocks governance weight and oracle eligibility."],
  ["Step 03", "Economic Signal", "VELD circulation grows proportionally to verified humanitarian activity. Token value is anchored to real impact density."],
  ["Step 04", "CrisisFund", "1% of all transactions feeds the CrisisFund reserve. In active crisis zones, multipliers redirect additional VELD to acute need."],
  ["Step 05", "Governance", "Token holders and reputation-ranked participants vote on protocol parameters, action category weights, and CrisisFund deployment."]
] as const;

const GOV_CARDS = [
  ["01", "Proposal System", "Any participant holding GUARDIAN rank or above may submit governance proposals. Proposals require a 72-hour deliberation window before voting opens.", "Proposal Threshold: GUARDIAN rank (≥ 100 reputation)\nDeliberation Window: 72 hours\nVoting Period: 5 days"],
  ["02", "Quadratic Voting", "Voting power is the square root of a participant's reputation score, adjusted by VELD holdings. This prevents plutocratic capture while rewarding sustained impact contribution.", "Voting Power = √(reputation_score) × log(1 + veld_balance)\nCapped at SOVEREIGN-rank ceiling"],
  ["03", "CrisisFund Governance", "The CrisisFund reserve is governed by CHAMPION and SOVEREIGN ranked participants with special crisis-response authority. Deployment decisions require 60% consensus.", "Crisis Quorum: 60% of CHAMPION+ holders\nEmergency Window: 24 hours\nMax Single Deploy: 40% of reserve"],
  ["04", "Parameter Control", "Core protocol parameters — action category weights, oracle layer thresholds, reputation multipliers, and burn rates — are governed by the full DAO through standard proposal flow.", "Implementation Delay: 30 days\nSupermajority Required: 66%\nVeto Period: 7 days"]
] as const;

const SECURITY_ITEMS = [
  ["Anti-Sybil", "SovereignID System", "Social graph vouching requires three verified community attestations. Biometric hash binding prevents wallet rotation attacks."],
  ["Fraud Detection", "Multi-Vector Analysis", "Perceptual hashing detects duplicate images across all submissions. ELA identifies image manipulation. Screenshot classifiers block fabricated evidence."],
  ["Oracle Security", "Decentralised Network", "SATIN Oracle nodes require 1,000 VELD stake to register. Consensus scoring aggregates multiple node verdicts. Byzantine fault tolerance through outlier rejection."],
  ["Smart Contracts", "Formal Verification", "All contracts written in Solidity 0.8.20 with custom modifiers, reentrancy guards, and access control. Oracle signature verification prevents replay attacks."],
  ["Cryptography", "ZK Proof System", "Each impact event receives a unique zk-proof hash binding volunteer address, event ID, impact score, and token reward. Time-bound nonces prevent replay."],
  ["Governance", "Timelock Architecture", "All parameter changes execute after 30-day timelock. Emergency proposals require supermajority. Multisig treasury controls prevent unilateral fund movement."]
] as const;

const ROADMAP_PHASES: readonly RoadmapPhase[] = [
  ["Phase I · 2024", "Foundation", "active", ["BridgeStone L1 deployment", "SovereignID contract", "BenevolenceVault contract", "SATIN Oracle v1", "Genesis member onboarding", "WalletAuthModal + Haven wallet"]],
  ["Phase II · Q2 2025", "Expansion", "upcoming", ["SATIN Oracle v2 (8-layer pipeline)", "CrisisFund contract deployment", "Community Stream launch", "Quadratic governance DAO", "NGO partnership programme", "Oracle node network (beta)"]],
  ["Phase III · Q4 2025", "Scale", "upcoming", ["Cross-chain bridge (Avalanche mainnet)", "Institutional CSR integration", "Mobile app (iOS + Android)", "Oracle consensus network (full)", "DAO full autonomy transfer", "VELD liquidity programme"]],
  ["Phase IV · 2026", "Sovereign", "planned", ["Full DAO governance", "Self-sustaining oracle economy", "Multi-jurisdiction SovereignID", "CrisisFund autonomous deployment", "Protocol-as-a-Service API", "HAVEN ecosystem grants"]]
] as const;

const TEAM_DISCIPLINES = [
  ["Blockchain Engineering", "L1 Architecture · Smart Contracts · Oracle Networks"],
  ["AI & Verification", "Computer Vision · LLM Pipeline · ZK Systems"],
  ["Humanitarian Systems", "NGO Integration · SDG Alignment · Field Protocols"],
  ["Cryptoeconomics", "Tokenomics · Governance Design · Mechanism Theory"]
] as const;

const CONTACT_INFOS = [
  ["Protocol", "HAVEN Humanity Action Verification & Economic Network"],
  ["Blockchain", "BridgeStone L1 · Chain ID 777000"],
  ["Issuer", "StoneBridge Intelligence · Version 2.0 · 2025"],
  ["Status", "Genesis Phase · Active · Open for Participants"]
] as const;

const CONTACT_INPUTS = [
  ["Full Name", "text", "Your name"],
  ["Wallet Address", "text", "0x..."],
  ["Organisation / Affiliation", "text", "Organisation or independent"],
  ["Contact Email", "email", "Your email address"]
] as const;

const PARTICIPATION_TYPES = [
  "Volunteer Humanitarian Action Submission", "NGO / Relief Organisation Partner",
  "Corporate CSR Integration", "Oracle Node Operator", "DAO Governance Participant",
  "Institutional Inquiry"
] as const;

const FOOTER_NAV: readonly FooterCol[] = [
  ["Protocol", [["#poba", "Proof of Beneficial Action"], ["#satin", "SATIN Oracle"], ["#poba", "Smart Contracts"], ["#poba", "Security Audit"]]],
  ["Economy", [["#tokenomics", "VELD Tokenomics"], ["#tokenomics", "Living Economy"], ["#tokenomics", "CrisisFund"], ["#tokenomics", "Flywheel Model"]]],
  ["Governance", [["#governance", "DAO Proposals"], ["#governance", "Quadratic Voting"], ["#governance", "Community Stream"], ["#team", "StoneBridge Intelligence"]]]
] as const;