# RevealX v2 — Base Contracts

Foundry project containing the on-chain trust layer for RevealX v2.

## Contracts

| Contract | Purpose |
|----------|---------|
| `RevealXPool.sol` | ERC-4626 vault (rvlxUSDC). Shared LP pool that collects wagers and pays winners. |
| `CampaignRegistry.sol` | Creator campaign registry. Stores tier, branding URI, revenue share, and play limits. |
| `GameManager.sol` | Chainlink VRF v2.5 consumer. Handles `playCard` → VRF request → `fulfillRandomWords` → settlement. |

## Verified VRF Addresses

Docs: https://docs.chain.link/vrf/v2-5/supported-networks#base-mainnet

| Network | Coordinator | Key Hash (30 gwei) | LINK Token |
|---------|-------------|-------------------|------------|
| Base Mainnet | `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634` | `0xdc2f87677b01473c763cb0aee938ed3341512f6057324a584e5944e786144d70` | `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196` |
| Base Sepolia | `0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE` | `0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71` | `0xE4aB69C077896252FAFBD49EFD26B5D171A32410` |

## Quick Start

```bash
cd contracts/base
forge install
forge test -vvv
```

## Deploy to Base Sepolia

### 1. Create a VRF Subscription
1. Go to https://vrf.chain.link
2. Connect wallet on Base Sepolia
3. Create a subscription
4. Fund it with LINK (`0xE4aB69C077896252FAFBD49EFD26B5D171A32410` on Base Sepolia)
5. Note the **Subscription ID**

### 2. Set Environment Variables

Copy the root `.env.example` to `.env` and fill in:

```bash
DEPLOYER_PRIVATE_KEY=0x...
OWNER_ADDRESS=0x...          # Safe multisig or deployer
FEE_RECIPIENT=0x...          # Protocol treasury
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VRF_COORDINATOR=0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
VRF_SUBSCRIPTION_ID=<your-sub-id>
VRF_KEY_HASH=0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71
BASESCAN_API_KEY=...
```

### 3. Run Deploy Script

```bash
source .env
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --verify
```

### 4. Add GameManager as VRF Consumer

After deployment, go back to https://vrf.chain.link and add the deployed `GameManager` address as a consumer to your subscription.

### 5. Wire Contracts (if not done in script)

The deploy script already calls `setConfig` on GameManager. You must also:
- Call `RevealXPool.setGameManager(address(gameManager))` from the owner
- Call `CampaignRegistry.setGameManager(address(gameManager))` from the owner

## Test

```bash
forge test -vvv
```

Tests cover:
- ERC-4626 deposit / withdraw / mint / redeem
- Pausability
- Max payout bounds
- Unauthorized access reverts
- Campaign creation and duplicate prevention
- Full game lifecycle: play → VRF fulfill → win payout
- Full game lifecycle: play → VRF fulfill → loss
- Max payout cap enforcement
- Creator revenue share distribution
- Insufficient pool balance revert
