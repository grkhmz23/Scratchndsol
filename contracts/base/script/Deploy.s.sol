// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {RevealXPool} from "../src/RevealXPool.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {GameManager} from "../src/GameManager.sol";

/**
 * @title Deploy
 * @notice Deploy script for RevealX v2 Base contracts.
 * @dev Verified VRF Coordinator addresses:
 *      Base Mainnet: 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634
 *      Base Sepolia: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
 *      Docs: https://docs.chain.link/vrf/v2-5/supported-networks#base-mainnet
 *
 * Environment variables required:
 *   DEPLOYER_PRIVATE_KEY   - Deployer EOA private key
 *   OWNER_ADDRESS          - Safe multisig / owner address
 *   FEE_RECIPIENT          - Protocol fee recipient address
 *   USDC_ADDRESS           - USDC contract on target network
 *   VRF_COORDINATOR        - Chainlink VRF v2.5 coordinator address
 *   VRF_SUBSCRIPTION_ID    - Existing funded VRF subscription ID
 *   VRF_KEY_HASH           - Key hash for VRF requests
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        uint256 vrfSubscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");
        bytes32 vrfKeyHash = vm.envBytes32("VRF_KEY_HASH");

        // Base Sepolia defaults if not provided
        if (usdc == address(0)) {
            usdc = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
        }
        if (vrfCoordinator == address(0)) {
            vrfCoordinator = 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE; // Base Sepolia
        }

        vm.startBroadcast(deployerPrivateKey);

        RevealXPool pool = new RevealXPool(IERC20(usdc), owner, feeRecipient);
        CampaignRegistry registry = new CampaignRegistry(owner);
        GameManager gameManager = new GameManager(vrfCoordinator);

        gameManager.setConfig(
            address(pool),
            address(registry),
            usdc,
            vrfSubscriptionId,
            vrfKeyHash,
            1, // requestConfirmations
            500_000, // callbackGasLimit
            100e6 // minPoolReserve = 100 USDC
        );

        vm.stopBroadcast();

        // Note: The deployer must manually add the GameManager as a VRF consumer
        // and fund the subscription with LINK before playCard() can be used.
        // Base Sepolia LINK: 0xE4aB69C077896252FAFBD49EFD26B5D171A32410

        console.log("RevealXPool deployed at:", address(pool));
        console.log("CampaignRegistry deployed at:", address(registry));
        console.log("GameManager deployed at:", address(gameManager));
    }
}
