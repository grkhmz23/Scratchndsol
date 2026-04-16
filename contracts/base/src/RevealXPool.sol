// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RevealXPool
 * @notice ERC-4626 vault accepting USDC. LPs deposit USDC and mint rvlxUSDC shares.
 *         Only the authorized GameManager can settle wins and collect wagers.
 *         Protocol fee is 30% of net house edge (wager - payout) per game.
 */
contract RevealXPool is ERC4626, Ownable, Pausable {
    using SafeERC20 for IERC20;

    address public gameManager;
    address public feeRecipient;

    uint16 public maxPayoutBps;
    uint16 public constant PROTOCOL_FEE_BPS = 3000; // 30%
    uint16 public constant MIN_PAYOUT_BPS = 500;    // 5%
    uint16 public constant MAX_PAYOUT_BPS = 3000;   // 30%

    uint256 public totalWagers;
    uint256 public totalPayouts;

    event GameManagerSet(address indexed gameManager);
    event FeeRecipientSet(address indexed feeRecipient);
    event MaxPayoutBpsSet(uint16 maxPayoutBps);
    event WinSettled(address indexed player, uint256 wager, uint256 payout);
    event FeesDistributed(address indexed creator, uint256 creatorFee, uint256 protocolFee);

    modifier onlyGameManager() {
        require(msg.sender == gameManager, "RevealXPool: only game manager");
        _;
    }

    constructor(
        IERC20 asset_,
        address owner_,
        address feeRecipient_
    ) ERC20("RevealX LP USDC", "rvlxUSDC") ERC4626(asset_) Ownable(owner_) {
        require(feeRecipient_ != address(0), "RevealXPool: invalid fee recipient");
        feeRecipient = feeRecipient_;
        maxPayoutBps = 2500; // 25% default
    }

    function setGameManager(address gameManager_) external onlyOwner {
        require(gameManager_ != address(0), "RevealXPool: invalid address");
        gameManager = gameManager_;
        emit GameManagerSet(gameManager_);
    }

    function setFeeRecipient(address feeRecipient_) external onlyOwner {
        require(feeRecipient_ != address(0), "RevealXPool: invalid address");
        feeRecipient = feeRecipient_;
        emit FeeRecipientSet(feeRecipient_);
    }

    function setMaxPayoutBps(uint16 maxPayoutBps_) external onlyOwner {
        require(
            maxPayoutBps_ >= MIN_PAYOUT_BPS && maxPayoutBps_ <= MAX_PAYOUT_BPS,
            "RevealXPool: out of bounds"
        );
        maxPayoutBps = maxPayoutBps_;
        emit MaxPayoutBpsSet(maxPayoutBps_);
    }

    /**
     * @notice Maximum single payout allowed, computed as a percentage of total pool assets.
     */
    function maxPayout() public view returns (uint256) {
        return (totalAssets() * maxPayoutBps) / 10000;
    }

    /**
     * @notice Called by GameManager to pull a player's wager into the pool.
     */
    function collectWager(address from, uint256 amount) external onlyGameManager {
        IERC20(asset()).safeTransferFrom(from, address(this), amount);
    }

    /**
     * @notice Called by GameManager after VRF fulfillment to settle a game.
     * @param player            Winner address (receives payout)
     * @param wager             Amount wagered by the player
     * @param payout            Amount to pay out (0 for losses)
     * @param creator           Campaign creator address (receives revenue share)
     * @param creatorShareBps   Creator's share of the protocol fee in basis points
     */
    function settleWin(
        address player,
        uint256 wager,
        uint256 payout,
        address creator,
        uint16 creatorShareBps
    ) external onlyGameManager {
        require(payout <= maxPayout(), "RevealXPool: payout exceeds cap");

        totalWagers += wager;
        totalPayouts += payout;

        if (wager > payout) {
            uint256 netEdge = wager - payout;
            uint256 protocolFee = (netEdge * PROTOCOL_FEE_BPS) / 10000;
            uint256 creatorFee = (protocolFee * creatorShareBps) / 10000;
            uint256 feeRecipientShare = protocolFee - creatorFee;

            if (creatorFee > 0) {
                IERC20(asset()).safeTransfer(creator, creatorFee);
            }
            if (feeRecipientShare > 0) {
                IERC20(asset()).safeTransfer(feeRecipient, feeRecipientShare);
            }

            emit FeesDistributed(creator, creatorFee, feeRecipientShare);
        }

        if (payout > 0) {
            IERC20(asset()).safeTransfer(player, payout);
            emit WinSettled(player, wager, payout);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                        ERC-4626 PAUSE OVERRIDES
    //////////////////////////////////////////////////////////////*/

    function deposit(uint256 assets, address receiver) public override whenNotPaused returns (uint256) {
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver) public override whenNotPaused returns (uint256) {
        return super.mint(shares, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner_) public override whenNotPaused returns (uint256) {
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(uint256 shares, address receiver, address owner_) public override whenNotPaused returns (uint256) {
        return super.redeem(shares, receiver, owner_);
    }
}
