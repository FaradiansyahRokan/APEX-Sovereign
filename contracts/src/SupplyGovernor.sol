// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          APEX HUMANITY — SupplyGovernor.sol                             ║
 * ║          Layer 2: Living Economy / Tokenomics v1.0.0                    ║
 * ║                                                                          ║
 * ║  Dynamic mint cap = f(global_suffering_index) × BASE_SUPPLY             ║
 * ║  Suffering Index diupdate oleh SATIN Oracle dari data GDACS + OCHA.     ║
 * ║                                                                          ║
 * ║  Formula:                                                                ║
 * ║    annual_mint_cap = BASE_SUPPLY × (1 + suffering_index × FLEX_FACTOR)  ║
 * ║    Max cap di Planetary phase: BASE_SUPPLY × 3                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/access/AccessControl.sol";

error SG__OracleOnly();
error SG__InvalidIndex();
error SG__ZeroAddress();

contract SupplyGovernor is AccessControl {

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant DAO_ROLE    = keccak256("DAO_ROLE");

    // ── Constants ───────────────────────────────────────────────────────────────
    uint256 public constant BASE_SUPPLY   = 100_000_000 ether;   // 100M tokens
    uint256 public constant FLEX_FACTOR   = 2;                    // max 3× during crisis
    uint256 public constant PRECISION     = 1e4;                  // 10000 = 100% (basis points)

    // ── Deployment phases → max cap multiplier (in PRECISION units) ──────────────
    // genesis=120%, sovereign=200%, quadratic=250%, planetary=300%
    uint256 public constant PHASE_CAP_GENESIS    = 12_000;
    uint256 public constant PHASE_CAP_SOVEREIGN  = 20_000;
    uint256 public constant PHASE_CAP_QUADRATIC  = 25_000;
    uint256 public constant PHASE_CAP_PLANETARY  = 30_000;

    // ── State ───────────────────────────────────────────────────────────────────
    uint256 public sufferingIndex;        // 0–10000 (0.00–1.00 scaled by PRECISION)
    uint256 public lastUpdated;           // timestamp of last oracle update
    uint256 public currentPhaseCap;       // active phase cap (PRECISION-scaled)
    string  public currentPhase;          // "genesis"|"sovereign"|"quadratic"|"planetary"|etc.

    // Idle token decay tracking
    uint256 public totalIdleTokensEstimate;  // updated by oracle
    uint256 public constant IDLE_DECAY_BPS = 200;   // 2% annual = 200 bps

    // ── Events ───────────────────────────────────────────────────────────────────
    event SufferingIndexUpdated(uint256 oldIndex, uint256 newIndex, uint256 timestamp);
    event PhaseAdvanced(string oldPhase, string newPhase, uint256 timestamp);

    // ── Constructor ──────────────────────────────────────────────────────────────
    constructor(address oracle, address dao) {
        if (oracle == address(0) || dao == address(0)) revert SG__ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE,    dao);
        _grantRole(ORACLE_ROLE, oracle);

        currentPhaseCap = PHASE_CAP_GENESIS;
        currentPhase    = "genesis";
        sufferingIndex  = 5_000;   // default: 0.50 (medium crisis)
        lastUpdated     = block.timestamp;
    }

    // ── Oracle Updates ────────────────────────────────────────────────────────────

    /**
     * @notice Update the global suffering index.
     * @param newIndex 0–10000 (0.00–1.00 scaled by PRECISION)
     */
    function updateSufferingIndex(uint256 newIndex) external onlyRole(ORACLE_ROLE) {
        if (newIndex > PRECISION) revert SG__InvalidIndex();
        emit SufferingIndexUpdated(sufferingIndex, newIndex, block.timestamp);
        sufferingIndex = newIndex;
        lastUpdated    = block.timestamp;
    }

    function updateIdleTokensEstimate(uint256 estimate) external onlyRole(ORACLE_ROLE) {
        totalIdleTokensEstimate = estimate;
    }

    // ── DAO: Phase Advancement ────────────────────────────────────────────────────

    function advancePhase(string calldata newPhase, uint256 newPhaseCap)
        external onlyRole(DAO_ROLE)
    {
        emit PhaseAdvanced(currentPhase, newPhase, block.timestamp);
        currentPhase    = newPhase;
        currentPhaseCap = newPhaseCap;
    }

    // ── View: Mint Cap Calculator ─────────────────────────────────────────────────

    /**
     * @notice Returns the current annual mint cap in wei.
     * Formula: BASE_SUPPLY × (1 + sufferingIndex/PRECISION × FLEX_FACTOR)
     * Capped by currentPhaseCap.
     */
    function getAnnualMintCap() external view returns (uint256 mintCap) {
        // Raw cap: BASE × (1 + idx × 2)
        uint256 numerator = PRECISION + (sufferingIndex * FLEX_FACTOR);
        uint256 rawCap    = BASE_SUPPLY * numerator / PRECISION;

        // Phase cap
        uint256 phaseCapped = BASE_SUPPLY * currentPhaseCap / PRECISION;

        mintCap = rawCap < phaseCapped ? rawCap : phaseCapped;
    }

    /**
     * @notice Returns tokens-per-second mint rate.
     */
    function getMintRatePerSecond() external view returns (uint256) {
        return this.getAnnualMintCap() / 365 days;
    }

    /**
     * @notice Annual burn from idle tokens (as a deflationary offset).
     */
    function getAnnualIdleBurn() external view returns (uint256) {
        return totalIdleTokensEstimate * IDLE_DECAY_BPS / 10_000;
    }

    /**
     * @notice Full economy snapshot.
     */
    function getEconomySnapshot() external view returns (
        uint256 annualMintCap,
        uint256 mintRatePerSec,
        uint256 annualIdleBurn,
        uint256 _sufferingIndex,
        string memory phase,
        uint256 updatedAt
    ) {
        annualMintCap    = this.getAnnualMintCap();
        mintRatePerSec   = this.getMintRatePerSecond();
        annualIdleBurn   = this.getAnnualIdleBurn();
        _sufferingIndex  = sufferingIndex;
        phase            = currentPhase;
        updatedAt        = lastUpdated;
    }
}
