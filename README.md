# Integrated DeFi Crowdfunding and DeFi Platform

The repository contains a local Ganache crowdfunding and DeFi demonstration.
The current implementation includes crowdfunding, controlled CFT rewards,
ERC-4626 treasury shares, a fee-adjusted AMM/DEX, LP staking, validated
Chainlink-compatible pricing, checkpoint-based governance, and an isolated
flash-loan security fixture.

Read [ARCHITECTURE.md](./ARCHITECTURE.md), [CONTRACTS.md](./CONTRACTS.md),
[SECURITY.md](./SECURITY.md), [TESTING.md](./TESTING.md), and
[TOKENOMICS.md](./TOKENOMICS.md) before deploying.

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

The `package.json` for Hardhat is inside `blockchain`, not the repository
root. Always run these commands from `blockchain`:

```powershell
cd blockchain
npm install
npm run compile
npm run deploy:ganache
```

The Hardhat compiler is configured with the `cancun` EVM target because the
current OpenZeppelin ERC-4626 implementation uses Cancun's `mcopy`
instruction. If Ignition reports that several simple constructors revert
during simulation, stop any stale Ganache process, restart the Ganache
workspace, and rerun the compile and deployment commands above.

Save all six new addresses from Ignition:
`campaignToken`, `crowdfunding`, `lpToken`, `liquidityPool`, `rewardToken`, `stakingFarm`.

Do not overwrite the old address notes. The old deployment remains available on Sepolia.

The Sepolia addresses previously recorded in older notes are legacy addresses.
After the `minAmountOut` contract change, use the addresses printed by the new
`IntegratedDeFi.ts` deployment in `frontend/app.js`.

## Run locally with Ganache (100 ETH accounts)

Ganache is a local development chain. The ETH shown in these accounts has no
real-world value.

1. Open Ganache and create a workspace using the following server settings:
   - Host: `127.0.0.1`
   - Port: `7545`
   - Network ID / chain ID: `1337`
   - Accounts: set the default account balance to `100` ETH.
2. Import Ganache's first account into MetaMask using its private key. Do not
   use this private key on Sepolia or any public network.
3. Add/select a MetaMask network with RPC URL
   `http://127.0.0.1:7545` and chain ID `1337`.
4. In a separate terminal, from `blockchain`, set the private key of the
   imported Ganache account for deployment:

   ```powershell
   $env:GANACHE_PRIVATE_KEY = "<private key shown by Ganache>"
   npm run compile
   npm run deploy:ganache
   ```

   The deployment prints addresses for `campaignToken`, `crowdfunding`, and
   `liquidityPool`. Copy those three addresses into
   `frontend/local-contracts.js`. If the Ganache workspace is reset, deploy
   again and replace the addresses.
5. Serve the `frontend` directory with any local static HTTP server and open
   it in the browser. Click **Connect MetaMask** while the Ganache network is
   selected. The frontend accepts both Ganache (`1337`) and Sepolia
   (`11155111`), and uses the matching contract addresses.

The Hardhat configuration defaults the Ganache RPC URL to
`http://127.0.0.1:7545`; set `GANACHE_RPC_URL` only when Ganache uses a
different endpoint.

## Exact Experiment 6 demonstration

The following values work with a fresh `IntegratedDeFi` deployment. Use four
funded accounts:

- Account 1: deployer/admin
- Account 2: campaign creator
- Account 3: trader
- Account 4: liquidity provider

### 1. Deploy

For Ganache, follow the local instructions above. For Sepolia, create `blockchain/.env` with `SEPOLIA_RPC_URL` and the private
key for Account 1, then run from the repository root:

```powershell
cd blockchain
npm install
npm run compile
npx hardhat ignition deploy ignition/modules/IntegratedDeFi.ts --network sepolia
```

Save all six addresses printed by Ignition. The frontend needs
`campaignToken`, `crowdfunding`, and `liquidityPool`.

### 2. Configure frontend addresses

For Sepolia, update the `CONTRACTS` object at the top of
`frontend/app.js` with the addresses from this deployment. Do not use the old
address notes after redeploying the changed slippage-protected pool.

For Ganache, copy the three local addresses into
`frontend/local-contracts.js`. Leave these values blank only when using
Sepolia.

### 3. Connect the wallet

Serve `frontend/index.html` through VS Code Live Server or another local HTTP
server. Do not open it using `file://`.

In MetaMask:

- Sepolia: select Ethereum Sepolia, chain ID `11155111`.
- Ganache: select the local network at `http://127.0.0.1:7545`, chain ID
  `1337`.

Click **Connect MetaMask**. Confirm that the displayed network and account are
correct. The app rejects unsupported networks.

### 4. Create a campaign

Switch to Account 2 and enter:

```text
Goal (ETH): 1
Duration (seconds): 3600
```

Click **Create Campaign** and confirm the transaction.

### 5. Mint CFT for the liquidity provider

Switch to Account 4. In the **Contribute** section enter:

```text
Campaign ID: 1
Contribution (ETH): 0.1
```

Click **Contribute ETH**. A fresh corrected deployment mints approximately
`100 CFT` because the reward is `msg.value * 1000`. Confirm that the CFT
balance is at least `100 CFT`.

### 6. Seed the AMM intentionally

Remain on Account 4. In **Add Liquidity**, enter:

```text
ETH Amount: 0.1
CFT Amount: 100
```

Click **Add Liquidity**, approve CFT when prompted, then confirm the liquidity
transaction. This is an intentional provider deposit; crowdfunding funds are
not automatically sent to the AMM.

The pool should now show approximately:

```text
ETH Reserve: 0.1 ETH
CFT Reserve: 100 CFT
```

### 7. Demonstrate ETH to CFT

Switch to Account 3. Ensure it has at least `0.02 ETH`. In the **Experiment 6
DEX** section enter:

```text
From: ETH
Amount: 0.01
Slippage tolerance (%): 0.5
```

The estimated output should be approximately `9.066 CFT` for the initial
`0.1 ETH / 100 CFT` pool. Click **Swap** and confirm both the wallet prompt
and transaction confirmation. The exact output may differ if the pool was
used previously.

### 8. Demonstrate CFT to ETH

Account 3 now has approximately `9.066 CFT`. In the same DEX section enter:

```text
From: CFT
Amount: 1
Slippage tolerance (%): 0.5
```

The estimated output should be approximately `0.001197 ETH` because the
previous ETH-to-CFT swap changed the reserves. Click **Swap**.
First approve CFT spending, then confirm the swap. The app passes a calculated
`minAmountOut` to the pool, and the contract rejects a worse execution.

After each successful swap, verify that balances, reserves, spot prices, and
the constant-product value refresh.

### 9. Optional liquidity removal

Switch to Account 4 and enter a positive LP share amount shown by the pool.
Click **Remove Liquidity**. No LP approval is required because the pool burns
the caller's LP tokens directly. Confirm that proportional ETH and CFT return
to Account 4.

## Important details and limitations
- `0.001 ETH` should mint `1 CFT`: CFT has 18 decimals and the contract calculates `msg.value * 1000`.
- The AMM issues LP tokens equal to `sqrt(ETH base units * CFT base units)` for the first liquidity deposit, then proportional shares for later deposits.
- This is an educational testnet prototype, not audited or production-ready.
- Experiment 6 swaps accept and enforce a `minAmountOut` slippage parameter. The
  frontend estimates output from the current reserves and applies the configured
  tolerance before submitting the transaction.
- The farm emits a fixed `0.1 RWD/second` per farm. It is prefunded with 10,000 RWD; reward emissions are shared among stakers in proportion to their LP stake. Monitor funding for longer tests.
- The simple AMM's reserves are its accounting values; do not send ETH directly to it because its `receive()` handler rejects direct transfers.
- Campaign refunds do not burn previously minted CFT in this prototype. That is a known tokenomics limitation to address if the project is extended.

## Generic ERC-20 DEX contracts

Experiment 6 also includes a Uniswap-style ERC-20 DEX implementation:

- `blockchain/contracts/DexPair.sol`
- `blockchain/contracts/DexFactory.sol`
- `blockchain/contracts/DexRouter.sol`

The Pair is an ERC-20 LP token with 1,000 permanently locked initial LP
tokens, proportional mint/burn, reserve synchronisation, fee-adjusted
constant-product swaps, and `Mint`, `Burn`, `Swap`, and `Sync` events. The
Factory creates sorted token pairs and rejects duplicates. The Router creates
pairs when needed, preserves pool ratios for liquidity operations, enforces
deadlines and minimum outputs, and supports single-hop and multi-hop swaps.

Deploy the updated integrated module from `blockchain`:

```powershell
cd E:\CBDPRO\CBDCrowdfundingProj\blockchain
$env:GANACHE_RPC_URL = "http://127.0.0.1:7545"
$env:GANACHE_PRIVATE_KEY = "<private key of a current Ganache account>"
npm run compile
npm run deploy:ganache
```

The deployment output includes `dexFactory` and `dexRouter`. Do not send
crowdfunding contributions directly to a DEX pair; provide liquidity through
the Router with deliberate ERC-20 approvals.
