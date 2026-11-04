# Architecture

The project is a local-first Web3 application. `CampaignToken` (CFT) is the
shared ERC-20/ERC-20Votes asset, while crowdfunding custody, the generic DEX,
the ETH/CFT pool, staking, and the treasury vault remain separate contracts.
Crowdfunding ETH is never transferred to either AMM.

## Contract graph

- `Crowdfunding` records ETH campaigns and delayed CFT claims.
- `CampaignToken` uses a single owner-configured minter and delegation-aware
  voting checkpoints.
- `DexFactory` creates `DexPair` instances; `DexRouter` performs slippage and
  deadline checked multi-hop swaps.
- `LiquidityPool` is the course-specific ETH/CFT pool and uses `LPToken`.
- `StakingFarm` distributes separately funded RWD rewards to LP stakers.
- `TreasuryVault` implements the OpenZeppelin ERC-4626 interface for an ERC-20
  asset.
- `ChainlinkPriceOracle` validates feed answers and stale timestamps.
- `DaoGovernance` uses CFT historical voting checkpoints and a timelocked
  arbitrary call for approved proposals.
- `FlashLoanDemo` is an isolated local security-test lender and is not required
  by production contracts.

Ganache uses `MockPriceFeed`; Sepolia deployments should use the verified
Chainlink ETH/USD feed address for that network.
