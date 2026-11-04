# DeFi Crowdfunding DApp --- Experiment 6

## Overview

This project is a decentralized crowdfunding DApp extended with DeFi
functionality.

Experiment 6 demonstrates:

1.  Creating crowdfunding campaigns in ETH
2.  Contributing ETH to campaigns
3.  Receiving Campaign Tokens (CFT)
4.  Providing liquidity to an ETH/CFT AMM
5.  Removing liquidity
6.  Swapping ETH for CFT
7.  Swapping CFT for ETH
8.  Viewing AMM reserves and LP shares
9.  Fee-adjusted swaps with on-chain minimum-output protection
10. DEX quotes, slippage settings, balances, and pool price information

The frontend uses **ethers.js v6**, MetaMask, and Ethereum Sepolia.

## Architecture

``` text
User
  |
Frontend (index.html + app.js)
  |
ethers.js v6
  |
MetaMask
  |
Ethereum Sepolia
  |
  +-------------------+
  |                   |
Crowdfunding      CampaignToken
  |                   |
  +------ CFT --------+
           |
      LiquidityPool
       /              ETH         CFT
       \         /
        AMM swaps
```

## Network

-   Network: Ethereum Sepolia
-   Chain ID: `11155111`

## Smart Contracts

### CampaignToken

ERC-20 Campaign Token with symbol `CFT`. The Crowdfunding contract is
configured as the minter.

### Crowdfunding

Creates campaigns, accepts ETH contributions, tracks contributions,
supports refunds, and mints CFT rewards.

Main functions:

``` text
createCampaign()
contribute()
withdrawFunds()
claimRefund()
getCampaign()
getContribution()
```

### LiquidityPool

Demonstrates an automated market maker between ETH and CFT using a
constant-product model:

``` text
x * y = k
```

It uses a 0.3% swap fee.

Main functions:

``` text
addLiquidity(tokenAmount)
removeLiquidity(shares)
swapETHForToken(minAmountOut)
swapTokenForETH(tokenAmount, minAmountOut)
getAmountOut()
getK()
```

## Current Sepolia Deployment

  Contract        Address
  --------------- ----------------------------------------------
  CampaignToken   `0xb50204C13E3d317589c15a13049cfAC9287E7367`
  Crowdfunding    `0x5e2FAa0976A68658D31eE8811c24DDBF6d40ABD6`
  LiquidityPool   `0xB68FFE11249f8A4f7530181361890a0B6c9c7fB0`

These addresses are from the earlier deployment and are retained for reference.
Because Experiment 6 adds `minAmountOut` to the pool swap functions, deploy
`IntegratedDeFi.ts` again and replace these values before using the current
frontend.

## Frontend

Current frontend files:

``` text
index.html
app.js
package.json
package-lock.json
```

The frontend provides:

-   MetaMask connection
-   Campaign creation
-   ETH contribution
-   CFT balance
-   Campaign information
-   Add liquidity
-   Remove liquidity
-   ETH → CFT swap
-   CFT → ETH swap
-   AMM reserve display
-   LP share display
-   Constant-product `k` display

## Intended Experiment Flow

``` text
Connect MetaMask
       |
Create Campaign
       |
Contribute ETH
       |
Receive CFT
       |
Approve CFT
       |
Add ETH + CFT liquidity
       |
AMM reserves increase
       |
+------------------+
|                  |
ETH → CFT       CFT → ETH
|                  |
+--------+---------+
         |
   Updated balances
```

## Important Current Issue

The current deployed Crowdfunding contract contains this reward
calculation:

``` solidity
uint256 tokenAmount =
    (msg.value * TOKENS_PER_ETH) / 1 ether;
```

with:

``` solidity
TOKENS_PER_ETH = 1000;
```

Because CFT uses 18 decimals, a contribution of `0.001 ETH` currently
mints only:

``` text
1 raw CFT unit
```

which is displayed as:

``` text
0.000000000000000001 CFT
```

The intended corrected calculation would be:

``` solidity
uint256 tokenAmount =
    msg.value * TOKENS_PER_ETH;
```

An already deployed Solidity contract cannot be modified directly.

## Current Deployment Decision

Existing campaign and contribution data should be preserved.

Therefore, the current plan is to complete the AMM demonstration without
replacing the existing Crowdfunding deployment.

``` text
Existing Deployment
  ├── Campaigns        KEEP
  ├── Contributions    KEEP
  └── Existing CFT    KEEP

AMM Demonstration
  └── Separate suitable token/pool setup
```

If the final requirement specifically demands that the exact CFT minted
by the existing Crowdfunding contract be used in the AMM, a corrected
replacement deployment would be required.

## Current Testing Status

### Completed

-   Smart contracts compiled
-   Contracts deployed to Sepolia
-   MetaMask connected
-   Campaign creation tested
-   ETH contribution tested
-   CFT minting tested
-   CFT balance displayed
-   CFT approval tested

### Remaining

The remaining demonstration is:

``` text
AMM liquidity
    ↓
ETH/CFT reserves
    ↓
ETH → CFT swap
    ↓
CFT → ETH swap
```

The current CFT balance is too small for a meaningful AMM swap because
of the deployed token-decimal calculation issue.

## Security Features

The current LiquidityPool includes:

-   OpenZeppelin `SafeERC20`
-   OpenZeppelin `ReentrancyGuard`
-   Invalid-amount checks
-   Insufficient-liquidity checks
-   Insufficient-output checks
-   ETH transfers using `.call`
-   Constant-product AMM calculation
-   0.3% swap fee

This is an academic demonstration, not a production-ready DEX.

## Suggested Final Demonstration

1.  Connect MetaMask to Sepolia.
2.  Show an existing or newly created campaign.
3.  Show an ETH contribution and CFT reward.
4.  Demonstrate the AMM liquidity setup.
5.  Show ETH and CFT reserves.
6.  Execute ETH → CFT.
7.  Execute CFT → ETH.
8.  Show the updated reserves and balances.

## Future Improvements

Potential production improvements include:

-   Slippage protection
-   Minimum output amounts
-   Swap deadlines
-   Minimum liquidity locking
-   More robust LP accounting
-   Better token-decimal handling
-   Transaction simulation and custom-error decoding
-   Comprehensive automated tests
-   Security auditing
-   Oracle integration
-   Governance integration

## Project Status

**Experiment 4:** Mostly complete

**Crowdfunding:** Functional on current deployment

**CFT reward:** Functional, but the deployed reward calculation has an
ERC-20 decimal scaling issue

**AMM:** Contract deployed; meaningful swap testing requires suitable
CFT liquidity

**Frontend:** Implemented with ethers.js v6

**Next task:** Complete the AMM demonstration without disturbing
existing crowdfunding data.

## Development Setup

### Prerequisites

Install the following before running the project:

-   Node.js and npm
-   MetaMask browser extension
-   A Sepolia-funded Ethereum account
-   The project dependencies from `package.json`

The smart-contract project uses Hardhat, TypeScript, Hardhat Ignition,
and ethers.js.

### Install Dependencies

From the project directory:

``` bash
npm install
```

### Environment Variables

Create a `.env` file in the Hardhat project directory.

It should contain:

``` text
SEPOLIA_RPC_URL=your_sepolia_rpc_url
SEPOLIA_PRIVATE_KEY=your_account_1_private_key
```

`SEPOLIA_PRIVATE_KEY` should belong to **Account 1 (Admin / Deployer)**.

Do not commit `.env` or expose the private key.

------------------------------------------------------------------------

## Compile the Smart Contracts

Run:

``` bash
npx hardhat compile
```

A successful compilation confirms that the Solidity contracts can be
compiled by Hardhat.

------------------------------------------------------------------------

## Check the Sepolia Connection

The Hardhat configuration uses the Sepolia RPC URL and Account 1 for
deployment.

The target network is:

``` text
Ethereum Sepolia
Chain ID: 11155111
```

Make sure Account 1 has enough Sepolia ETH to pay deployment gas.

------------------------------------------------------------------------

## Deploy the Contracts

Experiment 4 uses Hardhat Ignition.

Deploy with:

``` bash
npx hardhat ignition deploy ignition/modules/Experiment4.ts --network sepolia
```

The deployment module creates:

``` text
CampaignToken
      ↓
Crowdfunding
      ↓
LiquidityPool
```

It also configures the Crowdfunding contract as the CampaignToken
minter.

After deployment, record the three contract addresses.

If the frontend is being connected to a new deployment, update the
addresses in `app.js`:

``` javascript
const CONTRACTS = {
    campaignToken: "NEW_CAMPAIGN_TOKEN_ADDRESS",
    crowdfunding: "NEW_CROWDFUNDING_ADDRESS",
    liquidityPool: "NEW_LIQUIDITY_POOL_ADDRESS"
};
```

Do not replace the current addresses unless a new deployment is
intentionally being used.

------------------------------------------------------------------------

## Run the Frontend

The frontend consists of:

``` text
index.html
app.js
```

The page should be served through a local HTTP server rather than
relying on a direct `file://` URL.

For example, using VS Code Live Server:

``` text
Right-click index.html
        ↓
Open with Live Server
```

Then open the local address provided by the server.

The frontend loads ethers.js and connects to MetaMask.

------------------------------------------------------------------------

## MetaMask Account Roles

Four MetaMask accounts are used to demonstrate different actors in the
DApp.

### Account 1 --- Admin / Deployer

Account 1 is the deployment account.

Responsibilities:

-   Deploy the Experiment 4 contracts
-   Configure the CampaignToken minter
-   Hold deployment gas funds
-   Fund other test accounts with Sepolia ETH when necessary

The Sepolia private key used in `.env` belongs to Account 1.

------------------------------------------------------------------------

### Account 2 --- Campaign Creator

Account 2 represents the campaign creator.

Responsibilities:

-   Create campaigns
-   Receive contributions through successful campaign withdrawal
-   Demonstrate the creator-side crowdfunding workflow

Account 2 should be funded with Sepolia ETH for transactions.

------------------------------------------------------------------------

### Account 3 --- Contributor / Trader

Account 3 represents a contributor and trader.

Responsibilities:

-   Contribute ETH to campaigns
-   Receive CFT rewards
-   View CFT balance
-   Trade CFT through the AMM
-   Demonstrate ETH → CFT and CFT → ETH swaps

Account 3 should have enough Sepolia ETH for contributions and swap
transactions.

------------------------------------------------------------------------

### Account 4 --- Liquidity Provider

Account 4 represents a liquidity provider.

Responsibilities:

-   Hold CFT for liquidity provision
-   Approve the LiquidityPool to spend CFT
-   Add ETH + CFT liquidity
-   Receive LP shares
-   Remove liquidity later

Account 4 should have both:

``` text
Sepolia ETH
CFT
```

available before adding liquidity.

------------------------------------------------------------------------

## Recommended Demonstration Using the Four Accounts

A clean demonstration can use the accounts in this order:

``` text
Account 1
Admin / Deployer
      |
      | deploys contracts
      v
Ethereum Sepolia
      |
      +-------------------------+
      |                         |
      v                         v
Account 2                 Account 3
Campaign Creator          Contributor / Trader
      |                         |
      | create campaign         | contribute ETH
      |                         |
      +-----------+-------------+
                  |
                  v
             Campaign
                  |
                  v
              CFT reward
                  |
                  v
              Account 3
                  |
                  |
                  v
             Account 4
          Liquidity Provider
                  |
                  | ETH + CFT
                  v
             LiquidityPool
                  |
             +----+----+
             |         |
             v         v
          ETH → CFT  CFT → ETH
```

The exact account used for each step can be changed for testing, but the
above assignment keeps the roles clear for an academic demonstration.

------------------------------------------------------------------------

## Recommended Experiment 4 Run Order

### Step 1 --- Start with Account 1

Use Account 1 to:

1.  Deploy the contracts.
2.  Confirm the deployment addresses.
3.  Ensure the contracts are configured correctly.

### Step 2 --- Switch to Account 2

Create a campaign.

Example:

``` text
Goal: 0.01 ETH
Duration: 3600 seconds
```

### Step 3 --- Switch to Account 3

Contribute to the campaign.

Example:

``` text
Campaign ID: 1
Contribution: 0.001 ETH
```

Check the CFT balance afterward.

### Step 4 --- Switch to Account 4

Provide liquidity when a suitable CFT balance is available.

The normal sequence is:

``` text
Approve CFT
     ↓
Add ETH + CFT liquidity
     ↓
Receive LP shares
```

### Step 5 --- Demonstrate AMM Trading

Use a wallet with sufficient CFT/ETH to demonstrate:

``` text
ETH → CFT
```

and:

``` text
CFT → ETH
```

Refresh the pool after each transaction to show how the reserves change.

------------------------------------------------------------------------

## Important Wallet / Account Notes

Each MetaMask account has a different address and balance.

Switching accounts in MetaMask changes the `msg.sender` used by the
smart contracts.

Therefore:

``` text
Account 2 creates campaign
```

means the campaign creator is Account 2.

Similarly:

``` text
Account 3 contributes
```

means the contribution is recorded against Account 3.

And:

``` text
Account 4 adds liquidity
```

means the LP shares are credited to Account 4.

This makes the four accounts useful for demonstrating the different
actors in the DApp.

------------------------------------------------------------------------

## Basic Command Summary

### Install

``` bash
npm install
```

### Compile

``` bash
npx hardhat compile
```

### Deploy to Sepolia

``` bash
npx hardhat ignition deploy ignition/modules/Experiment4.ts --network sepolia
```

### Frontend

``` text
Open index.html through a local HTTP server / Live Server
```

### Network

``` text
Ethereum Sepolia
Chain ID: 11155111
```

### Account roles

``` text
Account 1 → Admin / Deployer
Account 2 → Campaign Creator
Account 3 → Contributor / Trader
Account 4 → Liquidity Provider
```

## Before Re-deploying

A new deployment creates new contract instances with new storage.

Therefore, a new Crowdfunding deployment starts with:

``` text
campaignCount = 0
```

and does not contain campaigns or contributions stored in the previous
Crowdfunding deployment.

The old contracts and their on-chain state are not deleted; they remain
at their original addresses.

For this reason, the current deployment should be preserved unless a new
deployment is intentionally required to correct the CFT decimal-scaling
issue.

------------------------------------------------------------------------

## Experiment 6: Exact Deployment-to-DEX Demo

This section is the authoritative runbook for the current
`LiquidityPool.sol`. It uses `IntegratedDeFi.ts`, which deploys the corrected
crowdfunding reward calculation, CampaignToken, LPToken, LiquidityPool, and
the staking contracts. Because Experiment 6 adds `minAmountOut` to both swap
functions, deploy a fresh `IntegratedDeFi` instance before testing. Do not use
an older pool address with the new frontend ABI.

### A. Ganache deployment

Run the following commands from the repository root. The `blockchain`
directory contains the Hardhat `package.json`.

1. Start Ganache with:

``` text
RPC URL: http://127.0.0.1:7545
Chain ID: 1337
Default account balance: 100 ETH
```

2. Import Ganache Account 1 into MetaMask using Ganache's private key. This
   key is for local testing only.
3. Open a PowerShell terminal in `blockchain` and run:

``` powershell
cd blockchain
$env:GANACHE_PRIVATE_KEY = "<private key for Ganache Account 1>"
npm install
npm run compile
npm run deploy:ganache
```

4. Copy the Ignition addresses for `campaignToken`, `crowdfunding`, and
   `liquidityPool` into `frontend/local-contracts.js`:

``` javascript
window.LOCAL_CONTRACTS = {
    campaignToken: "<campaignToken address>",
    crowdfunding: "<crowdfunding address>",
    liquidityPool: "<liquidityPool address>"
};
```

5. If Ganache is reset, all contract addresses change. Deploy again and
   replace the three values.

The Hardhat configuration uses the `paris` EVM target because some Ganache
versions do not support bytecode generated for the newer `osaka` target. If
multiple basic constructors revert during Ignition simulation, restart the
Ganache workspace and run `npm run compile` before deploying again.

### B. Sepolia deployment

1. Put these values in `blockchain/.env`:

``` text
SEPOLIA_RPC_URL=<Sepolia RPC URL>
SEPOLIA_PRIVATE_KEY=<Account 1 private key>
```

Never commit `.env` or use a Ganache private key on Sepolia.
2. From `blockchain`, run:

``` powershell
cd blockchain
npm install
npm run compile
npx hardhat ignition deploy ignition/modules/IntegratedDeFi.ts --network sepolia
```

3. Copy the new `campaignToken`, `crowdfunding`, and `liquidityPool` values
   into the `CONTRACTS` object at the top of `frontend/app.js`. The old
   Sepolia addresses in this file are from an earlier deployment and must not
   be used with the new slippage-protected ABI unless that deployment already
   contains the updated pool.

### C. Start the frontend and connect MetaMask

Serve `frontend/index.html` with VS Code Live Server. Do not use a `file://`
URL. In MetaMask select:

``` text
Ganache: Ethereum RPC http://127.0.0.1:7545, Chain ID 1337
or
Sepolia: Chain ID 11155111
```

Click **Connect MetaMask**. Confirm that the displayed account and network
match the account selected in MetaMask. The app rejects other networks.

### D. Exact values for the DEX demonstration

Use these roles:

``` text
Account 1: deployer
Account 2: campaign creator
Account 3: trader
Account 4: liquidity provider
```

1. Switch to Account 2. In **Create Campaign**, enter:

``` text
Goal (ETH): 1
Duration (seconds): 3600
```

   Click **Create Campaign**.
2. Switch to Account 4. In **Contribute**, enter:

``` text
Campaign ID: 1
Contribution (ETH): 0.1
```

   Click **Contribute ETH**. On a fresh corrected deployment this gives
   Account 4 approximately `100 CFT`.
3. Still using Account 4, in **Add Liquidity**, enter:

``` text
ETH Amount: 0.1
CFT Amount: 100
```

   Approve CFT and confirm the liquidity transaction. This intentionally
   seeds the pool at approximately `0.1 ETH / 100 CFT`; campaign funds are not
   automatically connected to the AMM.
4. Switch to Account 3. In **Experiment 6 DEX**, enter:

``` text
From: ETH
Amount: 0.01
Slippage tolerance (%): 0.5
```

   The initial quote is approximately `9.066 CFT`. Click **Swap** and confirm.
5. Keep Account 3 selected. Change the DEX fields to:

``` text
From: CFT
Amount: 1
Slippage tolerance (%): 0.5
```

   Account 3 receives CFT from the ETH swap, so this second quote is
   approximately `0.001197 ETH`. Click **Swap**, approve CFT first, and then
   confirm the swap. The quote changes after every swap because reserves change.
6. Refresh the AMM display and verify ETH reserve, CFT reserve, spot prices,
   LP shares, and `k`.

For a standalone CFT-to-ETH demonstration before the ETH-to-CFT swap, Account
3 must first receive at least `1 CFT` from a contribution. The initial quote
for `1 CFT` against a fresh `0.1 ETH / 100 CFT` pool is approximately
`0.000987 ETH`.

### E. Expected transaction sequence

``` text
Account 1 deploys
Account 2 creates campaign
Account 4 contributes 0.1 ETH and receives about 100 CFT
Account 4 approves CFT
Account 4 adds 0.1 ETH + 100 CFT liquidity
Account 3 swaps 0.01 ETH -> about 9.066 CFT
Account 3 approves 1 CFT
Account 3 swaps 1 CFT -> about 0.001197 ETH
```

Every swap uses the fee-adjusted constant-product formula and passes a
calculated `minAmountOut` to the contract. A changed quote below that minimum
reverts. The frontend displays pending, success, and error states and refreshes
balances and reserves after confirmation.
