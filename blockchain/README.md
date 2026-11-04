# Sample Hardhat 3 Project (`mocha` and `ethers`)

This project showcases a Hardhat 3 project using `mocha` for tests and the `ethers` library for Ethereum interactions.

To learn more about Hardhat 3, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3](https://hardhat.org/hardhat3-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using `mocha` and ethers.js
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Deploy to local Ganache

Ganache accounts can be created with a default balance of 100 ETH for local
testing. Start Ganache on `127.0.0.1:7545` with chain ID `1337`, import the
deployment account into MetaMask, and set its private key before deploying:

```powershell
cd blockchain
$env:GANACHE_PRIVATE_KEY = "<private key shown by Ganache>"
npm run compile
npm run deploy:ganache
```

The `ganache` network uses `http://127.0.0.1:7545` by default. Override it with
`GANACHE_RPC_URL` if needed. After deployment, copy the addresses printed by
Hardhat Ignition for `campaignToken`, `crowdfunding`, and `liquidityPool` into
`../frontend/local-contracts.js`. The frontend recognizes Ganache chain ID
`1337` as `Ganache Local (1337)`.

The compiler uses the `cancun` EVM target because the current OpenZeppelin
ERC-4626 implementation uses Cancun's `mcopy` instruction. Use a current
Ganache release that supports Cancun bytecode.

### Experiment 6 DEX

`LiquidityPool` implements the fee-adjusted constant-product formula and
requires `minAmountOut` for both swap directions. Existing deployments must be
redeployed after this contract interface change. Add liquidity deliberately
through `addLiquidity`; crowdfunding contributions are not routed into the
pool.

The generic ERC-20 DEX is implemented by `DexPair`, `DexFactory`, and
`DexRouter`. `IntegratedDeFi.ts` now deploys `dexFactory` and `dexRouter` in
addition to the existing crowdfunding contracts. The router supports:

- Pair creation and duplicate-pair protection.
- 0.3% fee-adjusted constant-product swaps.
- Single-hop and multi-hop `swapExactTokensForTokens`.
- Deadline and minimum-output protection.
- Ratio-aware liquidity addition and proportional liquidity removal.

Deploy to Ganache from this directory:

```powershell
$env:GANACHE_RPC_URL = "http://127.0.0.1:7545"
$env:GANACHE_PRIVATE_KEY = "<private key of a current Ganache account>"
npm run compile
npm run deploy:ganache
```

Record the Ignition addresses for `dexFactory`, `dexRouter`, and any deployed
token contracts. Approve the router before adding liquidity or swapping:

```text
token.approve(dexRouter, amount)
```

Then call `addLiquidity(tokenA, tokenB, amountADesired, amountBDesired,
amountAMin, amountBMin, recipient, deadline)` and
`swapExactTokensForTokens(amountIn, amountOutMin, path, recipient, deadline)`.
The original `LiquidityPool` remains available for the existing ETH/CFT UI and
is not replaced by this generic ERC-20 router.

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `mocha` tests:

```shell
npx hardhat test solidity
npx hardhat test mocha
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
