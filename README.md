# Integrated DeFi Crowdfunding — Experiments 4 and 5

## Design
- CFT is minted as a contribution reward by Crowdfunding.
- LiquidityPool trades ETH against CFT using the constant-product formula and a 0.3% fee.
- LiquidityPool issues transferable `ETHCFT-LP` ERC-20 tokens.
- Users can stake `ETHCFT-LP` in `StakingFarm` to earn separate `RWD` rewards.
- The existing deployments are not modified or deleted. This module deploys new contracts at new addresses.

## Files
- `contracts/CampaignToken.sol`
- `contracts/Crowdfunding.sol`
- `contracts/LPToken.sol`
- `contracts/LiquidityPool.sol`
- `contracts/DemoERC20.sol`
- `contracts/StakingFarm.sol`
- `ignition/modules/IntegratedDeFi.ts`

## Requirements
Run commands from the Hardhat project directory containing `hardhat.config.ts`. The project should already have compatible Hardhat 3, the configured Ignition plugin, OpenZeppelin Contracts 5.x, and dotenv dependencies.

## Compile and deploy
```powershell
npm install
npx hardhat compile
npx hardhat ignition deploy ignition/modules/IntegratedDeFi.ts --network sepolia
```

Save all six new addresses from Ignition:
`campaignToken`, `crowdfunding`, `lpToken`, `liquidityPool`, `rewardToken`, `stakingFarm`.

Do not overwrite the old address notes. The old deployment remains available on Sepolia.

## Exact demonstration
Use Ethereum Sepolia (chain ID 11155111) and four MetaMask accounts:
- Account 1: deployer/admin
- Account 2: campaign creator
- Account 3: contributor/trader
- Account 4: liquidity provider/farmer

1. Deploy with Account 1.
2. Switch to Account 2 and create a campaign with goal `0.01 ETH` and duration `3600` seconds.
3. Switch to Account 3 and contribute `0.001 ETH` to campaign ID 1. The corrected calculation should mint `1 CFT` (assuming no prior campaigns in this new deployment).
4. Account 4 needs both Sepolia ETH and CFT. Transfer CFT to Account 4 from a wallet that owns CFT, or have Account 4 contribute to a campaign itself. Each wallet needs ETH for gas.
5. Account 4 approves the LiquidityPool to spend CFT.
6. Account 4 adds liquidity with a suitable ETH/CFT pair. Start with small amounts, and keep the amounts close to the pool ratio after the initial deposit.
7. Confirm `ETHCFT-LP` balance increases for Account 4. This is the real LP token, not an internal-only mapping.
8. Account 4 approves StakingFarm to spend the LP tokens.
9. Account 4 stakes a small amount of LP tokens in StakingFarm.
10. Wait 10–30 seconds and query `pendingReward(Account4)`. It should become positive if reward funding is available.
11. Claim RWD and verify the RWD wallet balance increases.
12. Withdraw some or all LP tokens from StakingFarm.
13. Approve the AMM if needed? No approval is required to redeem LP tokens in this implementation: call `removeLiquidity(shares)` from the wallet holding them.
14. Verify ETH and CFT return to Account 4 and LP-token balance decreases.
15. From Account 3, execute `swapETHForToken()` with a small ETH amount. To test `swapTokenForETH()`, first approve the pool to spend CFT, then call the swap.

## Important details and limitations
- `0.001 ETH` should mint `1 CFT`: CFT has 18 decimals and the contract calculates `msg.value * 1000`.
- The AMM issues LP tokens equal to `sqrt(ETH base units * CFT base units)` for the first liquidity deposit, then proportional shares for later deposits.
- This is an educational testnet prototype, not audited or production-ready.
- The AMM has no `minAmountOut` slippage parameter yet; swaps should only be tested with small amounts.
- The farm emits a fixed `0.1 RWD/second` per farm. It is prefunded with 10,000 RWD; reward emissions are shared among stakers in proportion to their LP stake. Monitor funding for longer tests.
- The simple AMM's reserves are its accounting values; do not send ETH directly to it because its `receive()` handler rejects direct transfers.
- Campaign refunds do not burn previously minted CFT in this prototype. That is a known tokenomics limitation to address if the project is extended.
