// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {RevealXPool} from "../src/RevealXPool.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {GameManager} from "../src/GameManager.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1_000_000_000e6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RevealXTest is Test {
    MockUSDC public usdc;
    RevealXPool public pool;
    CampaignRegistry public registry;
    GameManager public gameManager;
    VRFCoordinatorV2_5Mock public coordinator;

    address public owner = makeAddr("owner");
    address public feeRecipient = makeAddr("feeRecipient");
    address public creator = makeAddr("creator");
    address public player = makeAddr("player");

    uint256 public subId;
    bytes32 public keyHash = 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71;

    function setUp() public {
        vm.startPrank(owner);

        // 1. Deploy mock VRF coordinator (baseFee, gasPrice, weiPerUnitLink)
        coordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1e9, 4e15);

        // 2. Deploy mock USDC
        usdc = new MockUSDC();

        // 3. Deploy core contracts
        pool = new RevealXPool(IERC20(address(usdc)), owner, feeRecipient);
        registry = new CampaignRegistry(owner);
        gameManager = new GameManager(address(coordinator));

        // 4. Create VRF subscription and add GameManager as consumer
        subId = coordinator.createSubscription();
        coordinator.addConsumer(subId, address(gameManager));
        coordinator.fundSubscription(subId, 1000 ether);

        // 5. Configure GameManager
        gameManager.setConfig(
            address(pool),
            address(registry),
            address(usdc),
            subId,
            keyHash,
            1, // requestConfirmations
            500_000, // callbackGasLimit
            100e6 // minPoolReserve = 100 USDC
        );

        // 6. Wire GameManager into Pool and Registry
        pool.setGameManager(address(gameManager));
        registry.setGameManager(address(gameManager));

        vm.stopPrank();

        // Give player and LP some USDC
        usdc.mint(player, 10_000e6);
        usdc.mint(address(this), 1_000_000e6);
    }

    /*//////////////////////////////////////////////////////////////
                        REVEALXPOOL TESTS
    //////////////////////////////////////////////////////////////*/

    function testDepositAndMintShares() public {
        uint256 depositAmount = 1000e6;
        usdc.approve(address(pool), depositAmount);
        uint256 shares = pool.deposit(depositAmount, address(this));
        assertEq(shares, depositAmount); // 1:1 on first deposit
        assertEq(pool.totalAssets(), depositAmount);
    }

    function testWithdrawAndRedeem() public {
        uint256 depositAmount = 1000e6;
        usdc.approve(address(pool), depositAmount);
        pool.deposit(depositAmount, address(this));

        uint256 shares = pool.balanceOf(address(this));
        pool.withdraw(depositAmount, address(this), address(this));
        assertEq(usdc.balanceOf(address(this)), 1_000_000e6);
        assertEq(pool.balanceOf(address(this)), 0);
    }

    function testMaxPayoutCapAndBounds() public {
        // Default is 2500 bps = 25%
        assertEq(pool.maxPayoutBps(), 2500);
        assertEq(pool.maxPayout(), 0); // no assets yet

        vm.prank(owner);
        pool.setMaxPayoutBps(500);
        assertEq(pool.maxPayoutBps(), 500);

        vm.prank(owner);
        pool.setMaxPayoutBps(3000);
        assertEq(pool.maxPayoutBps(), 3000);

        vm.expectRevert("RevealXPool: out of bounds");
        vm.prank(owner);
        pool.setMaxPayoutBps(4000);
    }

    function testPauseBlocksDeposits() public {
        usdc.approve(address(pool), 1000e6);
        vm.prank(owner);
        pool.pause();

        vm.expectRevert();
        pool.deposit(1000e6, address(this));
    }

    function testUnauthorizedSettleWinReverts() public {
        vm.expectRevert("RevealXPool: only game manager");
        pool.settleWin(player, 1e6, 0, creator, 1000);
    }

    function testUnauthorizedCollectWagerReverts() public {
        vm.expectRevert("RevealXPool: only game manager");
        pool.collectWager(player, 1e6);
    }

    /*//////////////////////////////////////////////////////////////
                        CAMPAIGN REGISTRY TESTS
    //////////////////////////////////////////////////////////////*/

    function testCreateCampaign() public {
        bytes32 campaignId = keccak256("campaign-1");
        CampaignRegistry.CampaignConfig memory config = CampaignRegistry.CampaignConfig({
            creator: creator,
            creatorShareBps: 2500,
            tier: CampaignRegistry.CardTier.Bronze,
            brandingURI: "ipfs://Qm...",
            maxPlays: 100,
            expiry: uint64(block.timestamp + 1 days)
        });

        vm.prank(creator);
        registry.createCampaign(campaignId, config);

        (CampaignRegistry.CampaignConfig memory stored, uint32 plays, bool active) = registry.getCampaign(campaignId);
        assertEq(stored.creator, creator);
        assertEq(stored.creatorShareBps, 2500);
        assertEq(plays, 0);
        assertTrue(active);
    }

    function testCreateCampaignRevertsOnDuplicate() public {
        bytes32 campaignId = keccak256("campaign-1");
        CampaignRegistry.CampaignConfig memory config = CampaignRegistry.CampaignConfig({
            creator: creator,
            creatorShareBps: 2500,
            tier: CampaignRegistry.CardTier.Bronze,
            brandingURI: "ipfs://Qm...",
            maxPlays: 100,
            expiry: uint64(block.timestamp + 1 days)
        });

        vm.prank(creator);
        registry.createCampaign(campaignId, config);

        vm.expectRevert("CampaignRegistry: exists");
        vm.prank(creator);
        registry.createCampaign(campaignId, config);
    }

    /*//////////////////////////////////////////////////////////////
                        GAME LIFECYCLE TESTS
    //////////////////////////////////////////////////////////////*/

    function _createCampaign(bytes32 campaignId, CampaignRegistry.CardTier tier) internal {
        CampaignRegistry.CampaignConfig memory config = CampaignRegistry.CampaignConfig({
            creator: creator,
            creatorShareBps: 2500, // 25% of protocol fee
            tier: tier,
            brandingURI: "ipfs://Qm...",
            maxPlays: 100,
            expiry: uint64(block.timestamp + 1 days)
        });
        vm.prank(creator);
        registry.createCampaign(campaignId, config);
    }

    function _seedPool(uint256 amount) internal {
        usdc.approve(address(pool), amount);
        pool.deposit(amount, address(this));
    }

    function testPlayAndWinPayout() public {
        bytes32 campaignId = keccak256("win-campaign");
        _createCampaign(campaignId, CampaignRegistry.CardTier.Bronze);
        _seedPool(10_000e6); // $10k pool

        uint256 wager = 1e6;
        vm.startPrank(player);
        usdc.approve(address(gameManager), wager);
        uint256 requestId = gameManager.playCard(campaignId, 0); // Bronze = tier 0
        vm.stopPrank();

        // Force a win with randomness = 0 (roll = 0 < threshold)
        uint256[] memory words = new uint256[](1);
        words[0] = 0;
        coordinator.fulfillRandomWordsWithOverride(requestId, address(gameManager), words);

        // Player should have received a payout
        assertGt(usdc.balanceOf(player), 10_000e6 - wager); // more than starting minus wager
    }

    function testPlayAndLoss() public {
        bytes32 campaignId = keccak256("loss-campaign");
        _createCampaign(campaignId, CampaignRegistry.CardTier.Bronze);
        _seedPool(10_000e6);

        uint256 playerStart = usdc.balanceOf(player);
        uint256 wager = 1e6;
        vm.startPrank(player);
        usdc.approve(address(gameManager), wager);
        uint256 requestId = gameManager.playCard(campaignId, 0);
        vm.stopPrank();

        // Force a loss with high randomness (roll >> threshold)
        uint256[] memory words = new uint256[](1);
        words[0] = 9e17; // large roll
        coordinator.fulfillRandomWordsWithOverride(requestId, address(gameManager), words);

        // Player should have lost the wager (no payout)
        assertEq(usdc.balanceOf(player), playerStart - wager);
    }

    function testMaxPayoutCap() public {
        bytes32 campaignId = keccak256("cap-campaign");
        _createCampaign(campaignId, CampaignRegistry.CardTier.Diamond);

        // Seed pool with exactly $1000
        _seedPool(1000e6);

        // maxPayout = 25% of $1000 = $250
        assertEq(pool.maxPayout(), 250e6);

        uint256 wager = 25e6; // Diamond tier
        vm.startPrank(player);
        usdc.approve(address(gameManager), wager);
        uint256 requestId = gameManager.playCard(campaignId, 4); // Diamond = tier 4
        vm.stopPrank();

        // Brute-force a randomness that yields multiplier 10 on win
        uint256 randomness = 0;
        while (uint256(keccak256(abi.encode(randomness, 1))) % 100 < 95) {
            randomness++;
        }

        uint256[] memory words = new uint256[](1);
        words[0] = randomness;
        coordinator.fulfillRandomWordsWithOverride(requestId, address(gameManager), words);

        uint256 playerBalanceAfterFirst = usdc.balanceOf(player);
        // First game: raw payout 250e6 equals cap 250e6, so no cap applied yet

        // Lower maxPayout to 200e6 (20% of remaining pool) for the second game
        vm.prank(owner);
        pool.setMaxPayoutBps(2000);

        bytes32 campaignId2 = keccak256("cap-campaign-2");
        _createCampaign(campaignId2, CampaignRegistry.CardTier.Diamond);

        vm.startPrank(player);
        usdc.approve(address(gameManager), wager);
        uint256 requestId2 = gameManager.playCard(campaignId2, 4);
        vm.stopPrank();

        coordinator.fulfillRandomWordsWithOverride(requestId2, address(gameManager), words);

        // Second game should be capped at 160e6 (20% of ~800e6 pool)
        // Player balance increase from second game = 160e6 - 25e6 wager = +135e6
        assertEq(usdc.balanceOf(player), playerBalanceAfterFirst - wager + 160e6);
    }

    function testCreatorRevenueShareDistribution() public {
        bytes32 campaignId = keccak256("rev-campaign");
        _createCampaign(campaignId, CampaignRegistry.CardTier.Bronze);
        _seedPool(10_000e6);

        uint256 creatorStart = usdc.balanceOf(creator);
        uint256 feeRecipientStart = usdc.balanceOf(feeRecipient);
        uint256 wager = 1e6;

        vm.startPrank(player);
        usdc.approve(address(gameManager), wager);
        uint256 requestId = gameManager.playCard(campaignId, 0);
        vm.stopPrank();

        // Force a loss so netEdge = wager = 1e6
        uint256[] memory words = new uint256[](1);
        words[0] = 9e17;
        coordinator.fulfillRandomWordsWithOverride(requestId, address(gameManager), words);

        // Protocol fee = 30% of 1e6 = 300_000
        // Creator fee = 25% of 300_000 = 75_000
        // Fee recipient = 225_000
        assertEq(usdc.balanceOf(creator) - creatorStart, 75_000);
        assertEq(usdc.balanceOf(feeRecipient) - feeRecipientStart, 225_000);
    }

    function testUnauthorizedPlayRevertsWhenPoolLow() public {
        bytes32 campaignId = keccak256("low-campaign");
        _createCampaign(campaignId, CampaignRegistry.CardTier.Bronze);
        // Don't seed pool

        vm.startPrank(player);
        usdc.approve(address(gameManager), 1e6);
        vm.expectRevert("GameManager: insufficient pool");
        gameManager.playCard(campaignId, 0);
        vm.stopPrank();
    }

    function testPlayRevertsForInactiveCampaign() public {
        bytes32 campaignId = keccak256("expired-campaign");
        CampaignRegistry.CampaignConfig memory config = CampaignRegistry.CampaignConfig({
            creator: creator,
            creatorShareBps: 1000,
            tier: CampaignRegistry.CardTier.Bronze,
            brandingURI: "ipfs://Qm...",
            maxPlays: 1,
            expiry: uint64(block.timestamp + 1 hours)
        });
        vm.prank(creator);
        registry.createCampaign(campaignId, config);

        // Warp past expiry
        vm.warp(block.timestamp + 2 hours);

        vm.startPrank(player);
        usdc.approve(address(gameManager), 1e6);
        vm.expectRevert("GameManager: campaign inactive");
        gameManager.playCard(campaignId, 0);
        vm.stopPrank();
    }
}
