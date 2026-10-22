# DeFi Crowdfunding DApp --- Experiment 4

## Overview

This project is a decentralized crowdfunding DApp extended with DeFi
functionality.

Experiment 4 demonstrates:

1.  Creating crowdfunding campaigns in ETH
2.  Contributing ETH to campaigns
3.  Receiving Campaign Tokens (CFT)
4.  Providing liquidity to an ETH/CFT AMM
5.  Removing liquidity
6.  Swapping ETH for CFT
7.  Swapping CFT for ETH
8.  Viewing AMM reserves and LP shares

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
addLiquidity()
removeLiquidity()
swapETHForToken()
swapTokenForETH()
getAmountOut()
getK()
```

## Current Sepolia Deployment

  Contract        Address
  --------------- ----------------------------------------------
  CampaignToken   `0xb50204C13E3d317589c15a13049cfAC9287E7367`
  Crowdfunding    `0x5e2FAa0976A68658D31eE8811c24DDBF6d40ABD6`
  LiquidityPool   `0xB68FFE11249f8A4f7530181361890a0B6c9c7fB0`

These addresses are for the current deployment.

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
