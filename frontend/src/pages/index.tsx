import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function LandingPage() {
  const router = useRouter();
  const goToApp = () => router.push("/app");

  // Force light theme on landing page, restore dark when leaving
  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-theme") || "dark";
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.setAttribute("data-theme", prev);
    };
  }, []);

  return (
    <>
      <Head>
        <title>HAVEN — Humanity Action Verification &amp; Economic Network</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Tenor+Sans&display=swap" />
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
          <li><a href="#tokenomics">STC</a></li>
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
            <h1 className="lp-hero-headline">
              Humanity<br />Action<br /><em>Verification</em><br />&amp; Economic<br />Network
            </h1>
            <p className="lp-hero-subhead">HAVEN Protocol · STC · PoBA</p>
            <p className="lp-hero-desc">
              A decentralised blockchain protocol that converts real-world humanitarian actions into on-chain economic value through a mechanism that has never existed before: <em>Proof of Beneficial Action.</em>
            </p>
            <div className="lp-hero-actions">
              <button onClick={goToApp} className="lp-btn-primary">Access the Protocol</button>
              <a href="#poba" className="lp-btn-outline">Explore the Protocol</a>
            </div>
          </div>
          <div className="lp-hero-divider" />
          <div className="lp-hero-right">
            <div className="lp-chain-badge">
              <div className="lp-chain-dot" />
              <span className="lp-label-caps">BridgeStone L1 · Active</span>
            </div>
            <div className="lp-hero-stats">
              {[[{ l: "Chain ID", n: "777000", note: "Sovereign L1" }, { l: "Native Token", n: "STC", note: "Proof-backed" }], [{ l: "Oracle Layers", n: "8", note: "SATIN AI pipeline" }, { l: "Action Types", n: "8+", note: "SDG-aligned" }]].map((row, i) => (
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
              {[["Consensus", "Avalanche PoS"], ["Identity", "SovereignID · Social Graph"], ["Verification", "YOLOv8 · LLaVA · zk-proof"], ["Governance", "Quadratic Voting DAO"], ["Status", "Genesis Phase · Open"]].map(([k, v]) => (
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
                {["Proof of Beneficial Action", "SATIN Oracle", "SovereignID", "STC Token", "Quadratic Governance", "CrisisFund", "BridgeStone L1", "Anti-Sybil Layer", "ZK Proofs", "Impact Scoring", "Cross-Temporal Chain", "Behavioral Fingerprint"].map(t => (
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
              {[["Accountability Gap", "Traditional aid systems lack verifiable, on-chain proof that humanitarian actions were performed. Donors cannot confirm their resources created real impact."], ["No Economic Signal", "Beneficial actions generate no economic reward for actors. The market has no mechanism to price human goodness, creating zero incentive alignment."], ["Sybil Vulnerability", "Existing reputation systems are trivially gamed. Without biometric binding and social vouching, any actor can fabricate humanitarian credentials at scale."], ["Opacity by Design", "NGO reporting operates on annual cycles with limited auditability. Real-time, cryptographically verifiable impact data does not exist in any current system."]].map(([t, b]) => (
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
            <div className="lp-poba-hl"><p>Every STC token in circulation is backed by a cryptographically verified act of human goodness — not computational waste or capital lockup.</p></div>
            <p className="lp-poba-body">The mechanism combines AI visual verification, GPS attestation, behavioral fingerprinting, and community consensus to produce tamper-proof impact proofs stored permanently on the BridgeStone L1.</p>
          </div>
          <div className="lp-poba-div" />
          <div className="lp-poba-right">
            <h3 className="lp-poba-title">Eight action<br /><em>categories</em></h3>
            <p className="lp-poba-body">HAVEN recognises eight primary humanitarian action categories, each mapped to specific UN Sustainable Development Goals.</p>
            <p className="lp-poba-body">The SATIN Oracle AI pipeline evaluates submissions using multi-phase visual examination, claim cross-referencing, and temporal behavioral analysis.</p>
          </div>
        </div>
        <div className="lp-action-grid">
          {[["ACT-001", "Food Distribution", "SDG 2 · Zero Hunger"], ["ACT-002", "Medical Aid", "SDG 3 · Good Health"], ["ACT-003", "Shelter Construction", "SDG 11 · Sustainable Cities"], ["ACT-004", "Education Session", "SDG 4 · Quality Education"], ["ACT-005", "Disaster Relief", "SDG 13 · Climate Action"], ["ACT-006", "Clean Water Project", "SDG 6 · Clean Water"], ["ACT-007", "Mental Health Support", "SDG 3 · Good Health"], ["ACT-008", "Environmental Action", "SDG 15 · Life on Land"]].map(([c, n, s]) => (
            <div key={c} className="lp-action-cell"><span className="lp-action-code">{c}</span><div className="lp-action-name">{n}</div><div className="lp-action-sdg">{s}</div></div>
          ))}
        </div>
        <div className="lp-formula">
          <div className="lp-formula-col"><div className="lp-formula-layer-num">Layer I</div><div className="lp-formula-layer-name">Visual Proof</div><div className="lp-formula-desc">YOLOv8 object detection + LLaVA visual witness. Phase 1 sees image without claims. Phase 2 cross-examines claims against visual evidence.</div></div>
          <div className="lp-formula-sep" />
          <div className="lp-formula-col"><div className="lp-formula-layer-num">Layer II</div><div className="lp-formula-layer-name">Anti-Sybil</div><div className="lp-formula-desc">Behavioral fingerprinting, GPS temporal analysis, device binding, and social graph vouching prevent identity fabrication at any scale.</div></div>
          <div className="lp-formula-sep" />
          <div className="lp-formula-col"><div className="lp-formula-layer-num">Layer III</div><div className="lp-formula-layer-name">On-Chain Proof</div><div className="lp-formula-desc">zk-proof hash, oracle signature, nonce, and expiry window produce a tamper-proof impact record. Smart contract validates and distributes STC atomically.</div></div>
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
            {([["L1", "Proof of Benevolence", "CV + Fraud Detection", "YOLOv8 object detection with ELA analysis, perceptual hashing, and EXIF forensics.", ["YOLOv8", "ELA", "pHash"]], ["L2", "Parameter Integrity", "3-Phase AI Exam", "Phase 1: LLaVA visual witness. Phase 2: Cross-examination of claims vs evidence. Phase 3: Synthesis verdict.", ["LLaVA", "Cross-Exam", "Verdict"]], ["L3", "Anti-Sybil", "Behavioral Fingerprinting", "Temporal GPS analysis, submission velocity, device fingerprint binding, cross-temporal chaining.", ["GPS Temporal", "Velocity", "Device"]], ["L4", "Community Consensus", "Decentralised Review", "Borderline submissions enter community deliberation. CHAMPION-ranked validators vote with quadratic power.", ["Quadratic", "Reputation", "DAO"]], ["L5", "Crisis Oracle", "Geo Multiplier", "Real-time crisis zone detection applies urgency multipliers to submissions from active disaster areas.", ["Crisis Zones", "Multiplier", "Geo"]], ["L6", "Impact Scoring", "Multi-Factor Formula", "Combines urgency, difficulty, reach, and authenticity weights into a 0–100 impact score.", ["Scoring", "Weights", "Formula"]], ["L7", "ZK Proof", "Cryptographic Attestation", "Oracle signs event hash, volunteer address, impact score, and token reward with a time-bound nonce.", ["zk-proof", "Oracle Sig", "On-chain"]], ["L8", "Reputation Ledger", "Cumulative Identity", "Each verified action updates the volunteer's on-chain reputation score, determining DAO voting weight.", ["Reputation", "DAO Weight", "Ledger"]]] as [string, string, string, string, string[]][]).map(([num, name, sub, desc, tags]) => (
              <div key={num} className="lp-layer-item">
                <div className="lp-layer-num-col"><span className="lp-layer-num">{num}</span></div>
                <div className="lp-layer-name-col"><div className="lp-layer-name">{name}</div><div className="lp-layer-sub">{sub}</div></div>
                <div className="lp-layer-desc-col"><div className="lp-layer-desc">{desc}</div><div className="lp-tech-tags">{tags.map(t => <span key={t} className="lp-tech-tag">{t}</span>)}</div></div>
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
            {[["01", "Establish Identity", "Register your SovereignID on-chain via the social graph vouching system. Three verified community members attest to your identity. Biometric hash binds your personhood to your wallet permanently."], ["02", "Perform Impact", "Conduct a verified humanitarian action in any of the eight recognised action categories. Document with photographic evidence at the location."], ["03", "Submit Proof", "Upload evidence through the HAVEN app. The SATIN Oracle pipeline examines your photograph independently, then cross-references your account. GPS coordinates and timestamp are cryptographically bound."], ["04", "Receive STC", "Upon oracle verification, a zk-proof is generated and submitted to the BenevolenceVault. STC tokens are distributed atomically. Your reputation score is updated on the Ledger."]].map(([n, t, b]) => (
              <div key={n} className="lp-journey-step"><div className="lp-step-num">{n}</div><div className="lp-step-title">{t}</div><p className="lp-step-body">{b}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* TOKENOMICS */}
      <section className="lp-tokenomics" id="tokenomics">
        <div className="lp-sec-header"><h2 className="lp-sec-title">STC <em>Tokenomics</em></h2><span className="lp-label-caps">Living Economy</span></div>
        <div className="lp-STC-grid">
          <div className="lp-STC-left">
            <h3 className="lp-STC-headline">The only token<br />backed by <em>goodness</em></h3>
            <div className="lp-token-params">
              {[["Token Name", "STC"], ["Supply Model", "Proof-backed · No pre-mine"], ["Issuance", "Only via verified impact actions"], ["Burn Mechanism", "1% transaction fee → CrisisFund"], ["Governance Weight", "Reputation-adjusted quadratic"], ["Smart Contract", "Solidity 0.8.20 · BridgeStone L1"]].map(([k, v]) => (
                <div key={k} className="lp-token-param"><span className="lp-tp-key">{k}</span><span className="lp-tp-val">{v}</span></div>
              ))}
            </div>
            <div className="lp-phases">
              {[["Genesis", "Seed issuance"], ["Growth", "Volunteer expansion"], ["Scale", "NGO integration"], ["Mature", "Institutional"], ["Sovereign", "Full DAO"]].map(([n, c]) => (
                <div key={n} className="lp-phase-cell"><div className="lp-phase-name">{n}</div><div className="lp-phase-cap">{c}</div></div>
              ))}
            </div>
          </div>
          <div className="lp-STC-div" />
          <div className="lp-STC-right">
            <div className="lp-flywheel-title">The Impact Flywheel</div>
            <div className="lp-flywheel-items">
              {[["Step 01", "Impact Action", "Volunteer performs verified humanitarian action. SATIN Oracle issues zk-proof. STC minted and distributed."], ["Step 02", "Reputation Accrual", "Each verified action increases on-chain reputation score. Higher rank unlocks governance weight and oracle eligibility."], ["Step 03", "Economic Signal", "STC circulation grows proportionally to verified humanitarian activity. Token value anchored to real impact density."], ["Step 04", "CrisisFund", "1% of all transactions feeds the CrisisFund reserve. In active crisis zones, multipliers redirect additional STC to acute need."], ["Step 05", "Governance", "Token holders and reputation-ranked participants vote on protocol parameters, action category weights, and CrisisFund deployment."]].map(([l, t, b]) => (
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
            {[["01", "Proposal System", "Any participant holding GUARDIAN rank or above may submit governance proposals. Proposals require a 72-hour deliberation window before voting opens.", "Proposal Threshold: GUARDIAN rank (≥ 100 reputation)\nDeliberation Window: 72 hours\nVoting Period: 5 days"], ["02", "Quadratic Voting", "Voting power is the square root of a participant's reputation score, adjusted by STC holdings. This prevents plutocratic capture while rewarding sustained impact contribution.", "Voting Power = √(reputation_score) × log(1 + veld_balance)\nCapped at SOVEREIGN-rank ceiling"], ["03", "CrisisFund Governance", "The CrisisFund reserve is governed by CHAMPION and SOVEREIGN ranked participants. Deployment decisions require 60% consensus within a 24-hour emergency window.", "Crisis Quorum: 60% of CHAMPION+ holders\nEmergency Window: 24 hours\nMax Single Deploy: 40% of reserve"], ["04", "Parameter Control", "Core protocol parameters — action category weights, oracle layer thresholds, reputation multipliers, and burn rates — are governed by the full DAO.", "Implementation Delay: 30 days\nSupermajority Required: 66%\nVeto Period: 7 days"]].map(([n, t, b, f]) => (
              <div key={n} className="lp-gov-card"><div className="lp-gov-card-num">{n}</div><div className="lp-gov-card-title">{t}</div><p className="lp-gov-card-body">{b}</p><div className="lp-gov-formula"><code>{f}</code></div></div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="lp-security">
        <div className="lp-security-inner">
          <div className="lp-sec-header" style={{ borderBottomColor: "rgba(253,250,246,0.15)" }}>
            <h2 className="lp-sec-title" style={{ color: "var(--bone)" }}>Security <em style={{ color: "var(--silver)" }}>Architecture</em></h2>
            <span className="lp-label-caps" style={{ color: "var(--stone)" }}>Multi-Layer Defence</span>
          </div>
          <div className="lp-security-grid">
            {[["Anti-Sybil", "SovereignID System", "Social graph vouching requires three verified community attestations. Biometric hash binding prevents wallet rotation attacks."], ["Fraud Detection", "Multi-Vector Analysis", "Perceptual hashing detects duplicate images. ELA identifies manipulation. Screenshot classifiers block fabricated evidence."], ["Oracle Security", "Decentralised Network", "SATIN Oracle nodes require 1,000 STC stake. Consensus scoring aggregates multiple node verdicts. Byzantine fault tolerance through outlier rejection."], ["Smart Contracts", "Formal Verification", "Solidity 0.8.20 with reentrancy guards and access control. Oracle signature verification prevents replay attacks."], ["Cryptography", "ZK Proof System", "Each impact event receives a unique zk-proof hash binding volunteer address, event ID, impact score, and token reward."], ["Governance", "Timelock Architecture", "All parameter changes execute after 30-day timelock. Emergency proposals require supermajority. Multisig treasury controls."]].map(([l, t, b]) => (
              <div key={l} className="lp-sec-card"><div className="lp-sec-card-label">{l}</div><div className="lp-sec-card-title">{t}</div><p className="lp-sec-card-body">{b}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* PULL QUOTE */}
      <div className="lp-pq-wrap">
        <div className="lp-pq-rule" />
        <div>
          <blockquote className="lp-pq-blockquote">&ldquo;We did not build a charity platform. We built a primitive — a new economic layer where human goodness becomes the scarcest and most valuable resource in the network.&rdquo;</blockquote>
          <cite className="lp-pq-cite">StoneBridge Intelligence · HAVEN Protocol v2.0</cite>
        </div>
        <div className="lp-pq-rule" />
      </div>

      {/* ROADMAP */}
      <section className="lp-roadmap" id="roadmap">
        <div className="lp-roadmap-inner">
          <div className="lp-sec-header"><h2 className="lp-sec-title">Protocol <em>Roadmap</em></h2><span className="lp-label-caps">Development Phases</span></div>
          <div className="lp-roadmap-track">
            {([["Phase I · 2024", "Foundation", "active", ["BridgeStone L1 deployment", "SovereignID contract", "BenevolenceVault contract", "SATIN Oracle v1", "Genesis member onboarding", "WalletAuthModal + Haven wallet"]], ["Phase II · Q2 2025", "Expansion", "upcoming", ["SATIN Oracle v2 (8-layer pipeline)", "CrisisFund contract deployment", "Community Stream launch", "Quadratic governance DAO", "NGO partnership programme", "Oracle node network (beta)"]], ["Phase III · Q4 2025", "Scale", "upcoming", ["Cross-chain bridge", "Institutional CSR integration", "Mobile app (iOS + Android)", "Oracle consensus network", "DAO full autonomy transfer", "STC liquidity programme"]], ["Phase IV · 2026", "Sovereign", "planned", ["Full DAO governance", "Self-sustaining oracle economy", "Multi-jurisdiction SovereignID", "CrisisFund autonomous deployment", "Protocol-as-a-Service API", "HAVEN ecosystem grants"]]] as [string, string, string, string[]][]).map(([tag, title, status, milestones]) => (
              <div key={tag} className="lp-roadmap-phase">
                <div className="lp-phase-meta">
                  <div className="lp-phase-tag">{tag}</div>
                  <div className="lp-phase-title">{title}</div>
                  <div className="lp-phase-status"><span className={`lp-phase-dot${status === "active" ? " lp-phase-dot-active" : ""}`} />{status}</div>
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
              {[["Blockchain Engineering", "L1 Architecture · Smart Contracts · Oracle Networks"], ["AI & Verification", "Computer Vision · LLM Pipeline · ZK Systems"], ["Humanitarian Systems", "NGO Integration · SDG Alignment · Field Protocols"], ["Cryptoeconomics", "Tokenomics · Governance Design · Mechanism Theory"]].map(([d, b]) => (
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
            <p className="lp-contact-body">HAVEN accepts volunteer registrations, NGO partnership inquiries, CSR integration proposals, and oracle node applications. All participants are onboarded through the SovereignID registration system with community vouching.</p>
            <div className="lp-contact-details">
              {[["Protocol", "HAVEN Humanity Action Verification & Economic Network"], ["Blockchain", "BridgeStone L1 · Chain ID 777000"], ["Issuer", "StoneBridge Intelligence · Version 2.0 · 2025"], ["Status", "Genesis Phase · Active · Open for Participants"]].map(([k, v]) => (
                <div key={k}><div className="lp-cd-label">{k}</div><div className="lp-cd-val">{v}</div></div>
              ))}
            </div>
            <div style={{ marginTop: "40px", paddingTop: "32px", borderTop: "1px solid rgba(253,250,246,0.12)" }}>
              <div className="lp-label-caps" style={{ color: "var(--stone)", marginBottom: "16px" }}>Ready to participate?</div>
              <button onClick={goToApp} className="lp-access-btn">Access the Protocol</button>
            </div>
          </div>
          <div className="lp-contact-div" />
          <form className="lp-contact-form" onSubmit={e => e.preventDefault()}>
            {[["Full Name", "text", "Your name"], ["Wallet Address", "text", "0x..."], ["Organisation / Affiliation", "text", "Organisation or independent"], ["Contact Email", "email", "Your email address"]].map(([label, type, ph]) => (
              <div key={label} className="lp-form-field"><label className="lp-form-label">{label}</label><input className="lp-form-input" type={type} placeholder={ph} /></div>
            ))}
            <div className="lp-form-field">
              <label className="lp-form-label">Participation Type</label>
              <select className="lp-form-select" defaultValue="">
                <option value="" disabled>Select participation type</option>
                {["Volunteer Humanitarian Action Submission", "NGO / Relief Organisation Partner", "Corporate CSR Integration", "Oracle Node Operator", "DAO Governance Participant", "Institutional Inquiry"].map(o => <option key={o}>{o}</option>)}
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
            <div><div className="lp-footer-wordmark">Haven</div><div className="lp-footer-protocol-line">Humanity Action Verification &amp; Economic Network</div><p className="lp-footer-tagline">A decentralised protocol where every token is backed by a verified act of human goodness.</p></div>
            {([["Protocol", [["#poba", "Proof of Beneficial Action"], ["#satin", "SATIN Oracle"], ["#poba", "Smart Contracts"], ["#poba", "Security Audit"]]], ["Economy", [["#tokenomics", "STC Tokenomics"], ["#tokenomics", "Living Economy"], ["#tokenomics", "CrisisFund"], ["#tokenomics", "Flywheel Model"]]], ["Governance", [["#governance", "DAO Proposals"], ["#governance", "Quadratic Voting"], ["#governance", "Community Stream"], ["#team", "StoneBridge Intelligence"]]]] as [string, [string, string][]][]).map(([title, links]) => (
              <div key={title}><div className="lp-footer-col-title">{title}</div><ul className="lp-footer-links">{links.map(([href, label]) => <li key={label}><a href={href}>{label}</a></li>)}</ul></div>
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