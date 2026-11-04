# Security Notes

## Threat model and controls

- Campaign ETH is isolated from liquidity and vault balances.
- Failed campaigns use pull refunds and zero the claimant's contribution before
  making the external ETH call.
- CFT is not minted until a successful campaign's contributor claims once.
- Restricted minting uses the owner-configured crowdfunding minter.
- ETH and token pools use checks-effects-interactions, `ReentrancyGuard`, safe
  ERC-20 transfers, fee-adjusted invariant checks, slippage limits, and
  deadlines.
- The oracle rejects non-positive, future-dated, and stale answers.
- Governance uses CFT historical checkpoints, quorum, and a timelock.

## Trust assumptions and limitations

The deployment owner controls the CFT minter and the local mock feed. Governance
configuration is immutable after deployment. The DEX remains exposed to normal
MEV, sandwiching, liquidity, and oracle-independent price risks. The platform
has not received a formal audit; independent review is required before any
real-value deployment.

`FlashLoanDemo` is intentionally a test-only lender. It must not be funded or
used as a production integration.

## Verification

From `blockchain`:

```powershell
npm run compile
npx hardhat test test/Core.test.ts test/Dex.test.ts
```

The validated result for the current implementation is 11 passing tests.
