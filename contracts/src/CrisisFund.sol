// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          APEX HUMANITY — CrisisFund.sol                                 ║
 * ║          Layer 7: Macro Economy Flywheel  v1.0.0                        ║
 * ║                                                                          ║
 * ║  Donation → Burn mechanism for APEX Living Economy.                     ║
 * ║                                                                          ║
 * ║  Cycle:                                                                  ║
 * ║    1. Donor sends APEX to CrisisFund                                    ║
 * ║    2. 95% goes to treasury (for crisis zone distribution)               ║
 * ║    3. 5% reflex bonus returned to donor (via native mint)               ║
 * ║    4. Treasury distributes to verified crisis zones via oracle signature ║
 * ║                                                                          ║
 * ║  Deflation: Every donation effectively removes tokens from circulation  ║
 * ║  and ties them to real-world crisis relief → closed-loop economy.       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface INativeMinter {
    function mintNativeCoin(address addr, uint256 amount) external;
}

error CF__ZeroAmount();
error CF__ZeroAddress();
error CF__InvalidSDG(uint8 sdg);
error CF__SignatureInvalid();

contract CrisisFund is AccessControl, ReentrancyGuard, Pausable {

    INativeMinter private constant NATIVE_MINTER =
        INativeMinter(0x0200000000000000000000000000000000000001);

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant DAO_ROLE    = keccak256("DAO_ROLE");

    // ── Config ────────────────────────────────────────────────────────────────────
    uint256 public constant REFLEX_BPS        = 500;    // 5% reflex bonus to donor
    uint256 public constant TREASURY_BPS      = 9500;   // 95% to treasury
    uint256 public constant MAX_SDG           = 17;     // UN has 17 SDG goals

    // ── State ─────────────────────────────────────────────────────────────────────
    uint256 public totalDonated;        // total APEX donated (wei)
    uint256 public totalDistributed;    // total APEX distributed to crisis zones
    uint256 public totalReflexPaid;     // total reflex bonus minted back to donors

    mapping(uint8 => uint256) public sdgTotalDonated;  // per-SDG donation tracking
    mapping(address => uint256) public donorTotal;      // per-donor total donated

    // ── Events ────────────────────────────────────────────────────────────────────
    event DonationReceived(
        address indexed donor,
        uint256 amount,
        uint8   sdg,
        uint256 reflexBonus,
        uint256 timestamp
    );
    event CrisisDistribution(
        address indexed crisisZone,
        uint256 amount,
        uint8   sdg,
        uint256 timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────────
    constructor(address oracle, address dao) {
        if (oracle == address(0) || dao == address(0)) revert CF__ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE,    dao);
        _grantRole(ORACLE_ROLE, oracle);
    }

    // ── CORE: DONATE AND BURN ─────────────────────────────────────────────────────

    /**
     * @notice Donate native APEX to humanity. Earns 5% reflex bonus.
     * @param sdgGoal UN SDG goal number (1–17) this donation targets
     */
    function donate(uint8 sdgGoal) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert CF__ZeroAmount();
        if (sdgGoal == 0 || sdgGoal > MAX_SDG) revert CF__InvalidSDG(sdgGoal);

        uint256 reflex    = msg.value * REFLEX_BPS    / 10_000;
        uint256 treasury  = msg.value * TREASURY_BPS  / 10_000;

        // Accounting
        totalDonated                 += msg.value;
        totalReflexPaid              += reflex;
        sdgTotalDonated[sdgGoal]     += msg.value;
        donorTotal[msg.sender]       += msg.value;

        // Reflex bonus: mint 5% back to donor via NativeMinter
        // This rewards generosity and incentivizes donations
        NATIVE_MINTER.mintNativeCoin(msg.sender, reflex);

        emit DonationReceived(msg.sender, msg.value, sdgGoal, reflex, block.timestamp);
    }

    // ── ORACLE: DISTRIBUTE TO CRISIS ZONES ────────────────────────────────────────

    /**
     * @notice Distribute treasury funds to a verified crisis zone.
     * @dev Only callable by APEX Oracle (crisis zone verified by GDACS/ReliefWeb)
     */
    function distributeToCrisis(
        address crisisZone,
        uint256 amount,
        uint8   sdgGoal
    ) external onlyRole(ORACLE_ROLE) nonReentrant {
        if (crisisZone == address(0)) revert CF__ZeroAddress();
        if (amount == 0) revert CF__ZeroAmount();
        if (sdgGoal == 0 || sdgGoal > MAX_SDG) revert CF__InvalidSDG(sdgGoal);

        totalDistributed += amount;
        // Transfer native APEX to crisis zone address
        (bool ok,) = crisisZone.call{value: amount}("");
        require(ok, "Transfer failed");

        emit CrisisDistribution(crisisZone, amount, sdgGoal, block.timestamp);
    }

    // ── VIEW FUNCTIONS ─────────────────────────────────────────────────────────────

    function getStats() external view returns (
        uint256 donated,
        uint256 distributed,
        uint256 reflexPaid,
        uint256 treasuryBalance
    ) {
        return (totalDonated, totalDistributed, totalReflexPaid, address(this).balance);
    }

    function getSDGStats(uint8 sdg) external view returns (uint256 totalForSDG) {
        return sdgTotalDonated[sdg];
    }

    // ── ADMIN ──────────────────────────────────────────────────────────────────────
    function pause()   external onlyRole(DAO_ROLE) { _pause(); }
    function unpause() external onlyRole(DAO_ROLE) { _unpause(); }

    receive() external payable {}
}
