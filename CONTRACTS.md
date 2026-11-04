# Contract Reference

| Contract | Responsibility |
|---|---|
| `CampaignToken` | CFT ERC-20, burnable, permit-enabled, vote checkpoints, controlled minting |
| `Crowdfunding` | Campaign creation, ETH contributions, delayed rewards, pull refunds |
| `TreasuryVault` | ERC-4626 deposit/mint/withdraw/redeem share accounting |
| `DexFactory` / `DexPair` / `DexRouter` | 0.3% fee AMM and multi-hop ERC-20 swaps |
| `LiquidityPool` / `LPToken` | Course ETH/CFT AMM and LP shares |
| `StakingFarm` | Reward-per-share LP staking |
| `ChainlinkPriceOracle` | Positive, timestamped, stale-price-checked feed reads |
| `DaoGovernance` | Snapshot voting, quorum, queue, and timelocked execution |
| `MockPriceFeed` | Ganache-only Chainlink-compatible test feed |
| `FlashLoanDemo` | Test-only repayment-enforced flash-loan demonstration |

Crowdfunding goals and contributions are ETH-denominated wei values. CFT
rewards are `contributionWei * 1000`, preserving 18-decimal precision.
