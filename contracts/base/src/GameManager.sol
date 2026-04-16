// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/vrf/dev/libraries/VRFV2PlusClient.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {RevealXPool} from "./RevealXPool.sol";
import {CampaignRegistry} from "./CampaignRegistry.sol";

/**
 * @title GameManager
 * @notice Chainlink VRF v2.5 consumer that handles the scratch card game lifecycle.
 *         Players call playCard() → VRF request fired → fulfillRandomWords() resolves
 *         outcome using the same odds table as the off-chain casino engine.
 * @dev Verified VRF Coordinator addresses:
 *      Base Mainnet: 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634
 *      Base Sepolia: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
 *      Docs: https://docs.chain.link/vrf/v2-5/supported-networks#base-mainnet
 */
contract GameManager is VRFConsumerBaseV2Plus {
    using SafeERC20 for IERC20;

    struct PendingGame {
        address player;
        bytes32 campaignId;
        uint256 wager;
        uint64 requestTime;
        bool exists;
    }

    RevealXPool public revealXPool;
    CampaignRegistry public campaignRegistry;
    IERC20 public usdc;

    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint16 public requestConfirmations;
    uint32 public callbackGasLimit;
    uint256 public minPoolReserve;

    mapping(uint256 => PendingGame) public pendingGames;

    event CardPlayed(
        uint256 indexed requestId,
        address indexed player,
        bytes32 indexed campaignId,
        uint256 wager
    );
    event GameSettled(
        address indexed player,
        bytes32 indexed campaignId,
        CampaignRegistry.CardTier tier,
        uint256 wager,
        uint256 payout,
        uint256 requestId
    );
    event ConfigUpdated(
        address revealXPool,
        address campaignRegistry,
        uint256 subscriptionId,
        bytes32 keyHash,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint256 minPoolReserve
    );

    constructor(address vrfCoordinator) VRFConsumerBaseV2Plus(vrfCoordinator) {}

    function setConfig(
        address revealXPool_,
        address campaignRegistry_,
        address usdc_,
        uint256 subscriptionId_,
        bytes32 keyHash_,
        uint16 requestConfirmations_,
        uint32 callbackGasLimit_,
        uint256 minPoolReserve_
    ) external onlyOwner {
        require(revealXPool_ != address(0), "GameManager: invalid pool");
        require(campaignRegistry_ != address(0), "GameManager: invalid registry");
        require(usdc_ != address(0), "GameManager: invalid usdc");
        require(subscriptionId_ > 0, "GameManager: invalid sub id");
        require(keyHash_ != bytes32(0), "GameManager: invalid key hash");
        require(requestConfirmations_ > 0, "GameManager: invalid confirmations");
        require(callbackGasLimit_ > 0, "GameManager: invalid gas limit");

        revealXPool = RevealXPool(revealXPool_);
        campaignRegistry = CampaignRegistry(campaignRegistry_);
        usdc = IERC20(usdc_);
        subscriptionId = subscriptionId_;
        keyHash = keyHash_;
        requestConfirmations = requestConfirmations_;
        callbackGasLimit = callbackGasLimit_;
        minPoolReserve = minPoolReserve_;

        emit ConfigUpdated(
            revealXPool_,
            campaignRegistry_,
            subscriptionId_,
            keyHash_,
            requestConfirmations_,
            callbackGasLimit_,
            minPoolReserve_
        );
    }

    /**
     * @notice Initiate a scratch card game. Pulls wager USDC from player and requests VRF randomness.
     * @param campaignId  The campaign to play under
     * @param tierIndex   Must match the campaign's configured tier
     */
    function playCard(bytes32 campaignId, uint8 tierIndex) external returns (uint256 requestId) {
        require(address(revealXPool) != address(0), "GameManager: not configured");
        require(campaignRegistry.isCampaignActive(campaignId), "GameManager: campaign inactive");

        (
            CampaignRegistry.CampaignConfig memory config,
            ,

        ) = campaignRegistry.getCampaign(campaignId);

        require(uint8(config.tier) == tierIndex, "GameManager: tier mismatch");

        uint256 wager = tierToWager(config.tier);
        require(wager > 0, "GameManager: invalid wager");

        // Pool health check (same logic as off-chain engine)
        uint256 poolBalance = revealXPool.totalAssets();
        require(poolBalance >= minPoolReserve + wager, "GameManager: insufficient pool");

        // Pull wager from player into this contract, then into the pool
        usdc.safeTransferFrom(msg.sender, address(this), wager);
        usdc.forceApprove(address(revealXPool), wager);
        revealXPool.collectWager(address(this), wager);

        // Request VRF randomness
        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: 1,
            extraArgs: VRFV2PlusClient._argsToBytes(
                VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
            )
        });

        requestId = s_vrfCoordinator.requestRandomWords(req);

        pendingGames[requestId] = PendingGame({
            player: msg.sender,
            campaignId: campaignId,
            wager: wager,
            requestTime: uint64(block.timestamp),
            exists: true
        });

        emit CardPlayed(requestId, msg.sender, campaignId, wager);
    }

    /**
     * @notice Chainlink VRF callback. Resolves the game outcome and settles with the pool.
     */
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        PendingGame memory game = pendingGames[requestId];
        require(game.exists, "GameManager: game not found");
        delete pendingGames[requestId];

        (
            CampaignRegistry.CampaignConfig memory config,
            ,

        ) = campaignRegistry.getCampaign(game.campaignId);

        uint256 poolBalance = revealXPool.totalAssets();
        (bool isWin, uint256 payout) = _resolveOutcome(randomWords[0], config.tier, poolBalance, game.wager);

        // Settle with pool (payout may be 0 for losses)
        revealXPool.settleWin(
            game.player,
            game.wager,
            payout,
            config.creator,
            config.creatorShareBps
        );

        campaignRegistry.incrementPlayCount(game.campaignId);

        emit GameSettled(
            game.player,
            game.campaignId,
            config.tier,
            game.wager,
            payout,
            requestId
        );
    }

    /*//////////////////////////////////////////////////////////////
                        CASINO ENGINE PORT (SOLIDITY)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Convert tier enum to wager in USDC raw units (6 decimals).
     */
    function tierToWager(CampaignRegistry.CardTier tier) public pure returns (uint256) {
        if (tier == CampaignRegistry.CardTier.Bronze) return 1e6;
        if (tier == CampaignRegistry.CardTier.Silver) return 2e6;
        if (tier == CampaignRegistry.CardTier.Gold) return 5e6;
        if (tier == CampaignRegistry.CardTier.Platinum) return 10e6;
        if (tier == CampaignRegistry.CardTier.Diamond) return 25e6;
        return 0;
    }

    /**
     * @notice Base win rate in basis points for each tier.
     *         Matches the off-chain engine:
     *         Bronze 25%, Silver 22%, Gold 20%, Platinum 18%, Diamond 15%.
     */
    function baseWinRateByTier(CampaignRegistry.CardTier tier) public pure returns (uint16) {
        if (tier == CampaignRegistry.CardTier.Bronze) return 2500;
        if (tier == CampaignRegistry.CardTier.Silver) return 2200;
        if (tier == CampaignRegistry.CardTier.Gold) return 2000;
        if (tier == CampaignRegistry.CardTier.Platinum) return 1800;
        if (tier == CampaignRegistry.CardTier.Diamond) return 1500;
        return 0;
    }

    /**
     * @notice Resolve outcome using the same math as the TypeScript casino engine.
     * @param randomness   VRF random word
     * @param tier         Card tier
     * @param poolBalance  Current total assets in the pool
     * @param wager        Wager amount for this game
     * @return isWin       Whether the player wins
     * @return payout      Payout amount in USDC raw units
     */
    function _resolveOutcome(
        uint256 randomness,
        CampaignRegistry.CardTier tier,
        uint256 poolBalance,
        uint256 wager
    ) internal view returns (bool isWin, uint256 payout) {
        uint256 baseWinRateBps = baseWinRateByTier(tier);

        // Pool health ratio = poolBalance / (poolBalance + 10 USDC)
        // Computed in 1e18 fixed point to match off-chain math.
        uint256 healthDenominator = poolBalance + (10 * 1e6);
        uint256 poolHealthRatio = (poolBalance * 1e18) / healthDenominator;

        // adjustedWinRate = baseWinRate * poolHealthRatio * (1 - houseEdge)
        // houseEdge = 10% => multiply by 9000/10000
        // Threshold is stored in 1e18 scale for direct comparison with roll.
        uint256 threshold = (baseWinRateBps * poolHealthRatio * 9000) / 1e8;

        uint256 roll = randomness % 1e18;
        if (roll >= threshold) {
            return (false, 0);
        }

        // Weighted multiplier selection (same weights as TS engine)
        // 1x = 50%, 2x = 30%, 5x = 15%, 10x = 5%
        uint256 weightRoll = uint256(keccak256(abi.encode(randomness, 1))) % 100;
        uint256 multiplier;
        if (weightRoll < 50) {
            multiplier = 1;
        } else if (weightRoll < 80) {
            multiplier = 2;
        } else if (weightRoll < 95) {
            multiplier = 5;
        } else {
            multiplier = 10;
        }

        uint256 rawPayout = wager * multiplier;
        uint256 maxPayoutAllowed = revealXPool.maxPayout();

        if (rawPayout > maxPayoutAllowed) {
            payout = maxPayoutAllowed;
        } else {
            payout = rawPayout;
        }

        if (payout == 0) {
            isWin = false;
        } else {
            isWin = true;
        }
    }
}
