# Testing

Run all current Hardhat tests from the `blockchain` directory:

```powershell
npm run compile
npx hardhat test
```

`test/Core.test.ts` covers successful delayed CFT claims, one-claim
enforcement, failed-campaign refunds without reward minting, ERC-4626
deposit/redeem accounting, and stale Chainlink data. `test/Dex.test.ts` covers
pair creation, locked minimum liquidity, fee-adjusted invariants, slippage,
deadlines, proportional liquidity, and multi-hop swaps.

The flash-loan experiment is intentionally isolated. A future security test
should deploy `FlashLoanDemo` with a mock token and compare a vulnerable
fixture with a production mitigation; it must not add an attack path to the
production contracts.
