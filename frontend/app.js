/* CBD DeFi operations console. Ethers v6, Ganache chain 1337 and Sepolia. */
const SEPOLIA = 11155111;
const GANACHE = 1337;
const SEPOLIA_CONTRACTS = {
  campaignToken: "0xb50204C13E3d317589c15a13049cfAC9287E7367",
  crowdfunding: "0x5e2FAa0976A68658D31eE8811c24DDBF6d40ABD6",
  liquidityPool: "0xB68FFE11249f8A4f7530181361890a0B6c9c7fB0"
};
const local = window.LOCAL_CONTRACTS || {};

const ABIS = {
  erc20: [
    "function name() view returns (string)", "function symbol() view returns (string)",
    "function decimals() view returns (uint8)", "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)", "function transfer(address,uint256) returns (bool)",
    "function burn(uint256)", "function nonces(address) view returns (uint256)"
  ],
  campaign: [
    "function campaignCount() view returns (uint256)", "function TOKENS_PER_ETH() view returns (uint256)",
    "function createCampaign(uint256,uint256)", "function contribute(uint256) payable",
    "function claimTokens(uint256)", "function claimRefund(uint256)", "function withdrawFunds(uint256)",
    "function getCampaign(uint256) view returns (address,uint256,uint256,uint256,bool)",
    "function getContribution(uint256,address) view returns (uint256)"
  ],
  pool: [
    "function reserveETH() view returns (uint256)", "function reserveToken() view returns (uint256)",
    "function totalLPShares() view returns (uint256)", "function lpBalance(address) view returns (uint256)",
    "function addLiquidity(uint256) payable returns (uint256)", "function removeLiquidity(uint256) returns (uint256,uint256)",
    "function swapETHForToken(uint256) payable returns (uint256)", "function swapTokenForETH(uint256,uint256) returns (uint256)",
    "function getAmountOut(uint256,uint256,uint256) view returns (uint256)", "function getK() view returns (uint256)"
  ],
  staking: [
    "function stakingToken() view returns (address)", "function rewardToken() view returns (address)",
    "function rewardPerSecond() view returns (uint256)", "function totalStaked() view returns (uint256)",
    "function pendingReward(address) view returns (uint256)", "function userInfo(address) view returns (uint256,uint256)",
    "function fundRewards(uint256)", "function updatePool()", "function stake(uint256)", "function claim()", "function withdraw(uint256)"
  ],
  router: [
    "function sortTokens(address,address) view returns (address,address)", "function getReserves(address,address) view returns (uint256,uint256)",
    "function quote(uint256,uint256,uint256) view returns (uint256)", "function getAmountOut(uint256,uint256,uint256) view returns (uint256)",
    "function getAmountsOut(uint256,address[]) view returns (uint256[])", "function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)",
    "function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)",
    "function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns (uint256[])"
  ],
  factory: [
    "function createPair(address,address) returns (address)", "function getPair(address,address) view returns (address)",
    "function allPairs(uint256) view returns (address)", "function allPairsLength() view returns (uint256)"
  ],
  vault: [
    "function asset() view returns (address)", "function totalAssets() view returns (uint256)",
    "function totalSupply() view returns (uint256)", "function balanceOf(address) view returns (uint256)",
    "function convertToShares(uint256) view returns (uint256)", "function convertToAssets(uint256) view returns (uint256)",
    "function deposit(uint256,address) returns (uint256)", "function mint(uint256,address) returns (uint256)",
    "function withdraw(uint256,address,address) returns (uint256)", "function redeem(uint256,address,address) returns (uint256)"
  ],
  oracle: ["function feed() view returns (address)", "function maxAge() view returns (uint256)", "function latestPrice() view returns (uint256,uint8)"],
  mockFeed: [
    "function decimals() view returns (uint8)", "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
    "function setAnswer(int256)"
  ],
  governance: [
    "function proposalCount() view returns (uint256)", "function propose(address,uint256,bytes,string) returns (uint256)",
    "function vote(uint256,bool)", "function queue(uint256)", "function execute(uint256) payable",
    "function proposals(uint256) view returns (address,address,uint256,bytes,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool)",
    "function hasVoted(uint256,address) view returns (bool)"
  ],
  flash: ["function flashLoan(address,uint256,address,bytes)"],
  tokenAdmin: ["function minter() view returns (address)", "function setMinter(address)"],
  pair: ["function token0() view returns (address)", "function token1() view returns (address)", "function getReserves() view returns (uint112,uint112)", "function mint(address) returns (uint256)", "function burn(address) returns (uint256,uint256)", "function swap(uint256,uint256,address)"]
};

let provider;
let signer;
let account;
let chainId;
let addresses = {};
let contracts = {};

const $ = id => document.getElementById(id);
const eth = value => ethers.parseEther(String(value || "0"));
const fmt = value => ethers.formatEther(value ?? 0n);
const valid = value => value && ethers.isAddress(value);
const addressOrAccount = value => valid(value) ? value : account;

function status(message, type = "") {
  const box = $("statusBox");
  box.textContent = message;
  box.className = `status ${type}`;
}

function errorText(error) {
  console.error(error);
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED") return "Transaction rejected in MetaMask.";
  return error?.shortMessage || error?.reason || error?.message || "The operation failed.";
}

function requireContract(name) {
  if (!contracts[name]) throw new Error(`${name} is not configured for this deployment. Redeploy IntegratedDeFi and update frontend/local-contracts.js.`);
  return contracts[name];
}

async function send(label, action) {
  try {
    status(`${label}: confirm the transaction in MetaMask...`);
    const tx = await action();
    status(`${label}: waiting for confirmation...`);
    const receipt = await tx.wait();
    status(`${label} completed. Transaction: ${receipt.hash}`, "success");
    await refreshAll();
    return receipt;
  } catch (error) {
    status(errorText(error), "error");
    return null;
  }
}

async function approve(token, spender, amount) {
  const current = await token.allowance(account, spender);
  if (current >= amount) return true;
  const receipt = await send("Approval", () => token.approve(spender, amount));
  return Boolean(receipt);
}

function buildContracts() {
  const definitions = {
    campaignToken: ["campaignToken", ABIS.erc20.concat(ABIS.tokenAdmin)],
    crowdfunding: ["crowdfunding", ABIS.campaign],
    lpToken: ["lpToken", ABIS.erc20],
    liquidityPool: ["liquidityPool", ABIS.pool],
    rewardToken: ["rewardToken", ABIS.erc20.concat(["function mint(address,uint256)"])],
    stakingFarm: ["stakingFarm", ABIS.staking],
    dexFactory: ["dexFactory", ABIS.factory], dexRouter: ["dexRouter", ABIS.router],
    treasuryVault: ["treasuryVault", ABIS.vault], priceOracle: ["priceOracle", ABIS.oracle],
    mockPriceFeed: ["mockPriceFeed", ABIS.mockFeed], governance: ["governance", ABIS.governance],
    flashLoanDemo: ["flashLoanDemo", ABIS.flash], dexPair: ["dexPair", ABIS.pair]
  };
  contracts = {};
  Object.entries(definitions).forEach(([name, [key, abi]]) => {
    if (valid(addresses[key])) contracts[name] = new ethers.Contract(addresses[key], abi, signer);
  });
}

async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error("MetaMask is not installed.");
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();
    chainId = Number((await provider.getNetwork()).chainId);
    if (![GANACHE, SEPOLIA].includes(chainId)) throw new Error("Switch MetaMask to Ganache (1337) or Sepolia (11155111).");
    addresses = chainId === GANACHE ? local : {...local, ...SEPOLIA_CONTRACTS};
    buildContracts();
    $("walletAddress").textContent = account;
    $("networkName").textContent = chainId === GANACHE ? "Ganache Local (1337)" : "Ethereum Sepolia";
    $("connectButton").textContent = "Wallet connected";
    renderContractList();
    populateConsole();
    await refreshAll();
    status("Wallet connected. Select a workflow above.", "success");
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  } catch (error) { status(errorText(error), "error"); }
}

function renderContractList() {
  $("contractList").innerHTML = Object.entries(addresses).map(([name, address]) =>
    `<div class="contract-row"><strong>${name}</strong><span class="address">${valid(address) ? address : "Not deployed/configured"}</span></div>`).join("");
}

function populateConsole() {
  $("consoleContract").innerHTML = Object.entries(addresses).filter(([, address]) => valid(address))
    .map(([name, address]) => `<option value="${name}">${name} (${address.slice(0, 8)}...)</option>`).join("");
}

async function refreshBalances() {
  if (!account || !provider) return;
  $("ethBalance").textContent = `${fmt(await provider.getBalance(account))} ETH`;
  for (const [id, name, suffix] of [["cftBalance", "campaignToken", "CFT"], ["rwdBalance", "rewardToken", "RWD"], ["lpBalance", "lpToken", "LP"]]) {
    try { $(id).textContent = `${fmt(await requireContract(name).balanceOf(account))} ${suffix}`; } catch { $(id).textContent = "Unavailable"; }
  }
}

async function refreshPool() {
  try {
    const pool = requireContract("liquidityPool");
    const [ethReserve, tokenReserve, shares, userShares, k] = await Promise.all([
      pool.reserveETH(), pool.reserveToken(), pool.totalLPShares(), pool.lpBalance(account), pool.getK()
    ]);
    $("poolDetails").innerHTML = `<div>ETH reserve: <strong>${fmt(ethReserve)} ETH</strong></div><div>CFT reserve: <strong>${fmt(tokenReserve)} CFT</strong></div><div>Your LP shares: <strong>${fmt(userShares)}</strong></div><div>Total LP shares: <strong>${fmt(shares)}</strong></div><div>Constant product: <strong>${k.toString()}</strong></div>`;
  } catch (error) { $("poolDetails").textContent = errorText(error); }
}

async function refreshStaking() {
  try {
    const farm = requireContract("stakingFarm");
    const [info, pending, total, rate] = await Promise.all([farm.userInfo(account), farm.pendingReward(account), farm.totalStaked(), farm.rewardPerSecond()]);
    $("stakeDetails").innerHTML = `<div>Your stake: <strong>${fmt(info[0])} LP</strong></div><div>Pending reward: <strong>${fmt(pending)} RWD</strong></div><div>Total staked: <strong>${fmt(total)} LP</strong></div><div>Rate: <strong>${fmt(rate)} RWD/sec</strong></div>`;
  } catch (error) { $("stakeDetails").textContent = errorText(error); }
}

async function refreshVault() {
  try {
    const vault = requireContract("treasuryVault");
    const [assets, shares, balance] = await Promise.all([vault.totalAssets(), vault.totalSupply(), vault.balanceOf(account)]);
    $("vaultDetails").innerHTML = `<div>Total CFT assets: <strong>${fmt(assets)}</strong></div><div>Total shares: <strong>${fmt(shares)}</strong></div><div>Your shares: <strong>${fmt(balance)}</strong></div>`;
  } catch (error) { $("vaultDetails").textContent = errorText(error); }
}

async function refreshAll() {
  if (!account) return;
  await Promise.all([refreshBalances(), refreshPool(), refreshStaking(), refreshVault()]);
}

async function createCampaign() { const c = requireContract("crowdfunding"); await send("Create campaign", () => c.createCampaign(eth($("campaignGoalInput").value), BigInt($("campaignDuration").value))); }
async function contribute() { const c = requireContract("crowdfunding"); await send("Contribution", () => c.contribute(BigInt($("contributeId").value), {value: eth($("contributeAmount").value)})); }
async function claimTokens() { await send("Claim CFT", () => requireContract("crowdfunding").claimTokens(BigInt($("actionCampaignId").value))); }
async function claimRefund() { await send("Claim refund", () => requireContract("crowdfunding").claimRefund(BigInt($("actionCampaignId").value))); }
async function withdrawFunds() { await send("Withdraw campaign", () => requireContract("crowdfunding").withdrawFunds(BigInt($("actionCampaignId").value))); }

async function lookupCampaign() {
  try {
    const id = BigInt($("lookupCampaignId").value);
    const c = requireContract("crowdfunding");
    const [data, contribution] = await Promise.all([c.getCampaign(id), c.getContribution(id, account)]);
    $("campaignDetails").innerHTML = `<div>Creator: <span class="address">${data[0]}</span></div><div>Goal: ${fmt(data[1])} ETH</div><div>Raised: ${fmt(data[3])} ETH</div><div>Deadline: ${new Date(Number(data[2]) * 1000).toLocaleString()}</div><div>Withdrawn: ${data[4]}</div><div>Your contribution: ${fmt(contribution)} ETH</div>`;
  } catch (error) { $("campaignDetails").textContent = errorText(error); }
}

async function addLiquidity() {
  const pool = requireContract("liquidityPool"), token = requireContract("campaignToken"), amount = eth($("addLiquidityToken").value);
  if (await approve(token, addresses.liquidityPool, amount)) await send("Add liquidity", () => pool.addLiquidity(amount, {value: eth($("addLiquidityEth").value)}));
}
async function removeLiquidity() { await send("Remove liquidity", () => requireContract("liquidityPool").removeLiquidity(eth($("removeLiquidityShares").value))); }
async function swapPool() {
  const pool = requireContract("liquidityPool"), amount = eth($("swapAmount").value), min = eth($("swapMinOut").value);
  if ($("swapDirection").value === "eth") await send("ETH to CFT swap", () => pool.swapETHForToken(min, {value: amount}));
  else if (await approve(requireContract("campaignToken"), addresses.liquidityPool, amount)) await send("CFT to ETH swap", () => pool.swapTokenForETH(amount, min));
}

async function stake() {
  const amount = eth($("stakeAmount").value);
  if (await approve(requireContract("lpToken"), addresses.stakingFarm, amount)) await send("Stake LP", () => requireContract("stakingFarm").stake(amount));
}
async function withdrawStake() { await send("Withdraw stake", () => requireContract("stakingFarm").withdraw(eth($("withdrawStakeAmount").value))); }
async function claimStakeRewards() { await send("Claim staking rewards", () => requireContract("stakingFarm").claim()); }
async function fundRewards() {
  const amount = eth($("fundRewardAmount").value);
  if (await approve(requireContract("rewardToken"), addresses.stakingFarm, amount)) await send("Fund rewards", () => requireContract("stakingFarm").fundRewards(amount));
}

async function propose() { await send("Create proposal", () => requireContract("governance").propose($("proposalTarget").value, eth($("proposalValue").value), $("proposalData").value || "0x", $("proposalDescription").value)); }
async function vote(support) { await send("Cast vote", () => requireContract("governance").vote(BigInt($("proposalId").value), support)); }
async function queueProposal() { await send("Queue proposal", () => requireContract("governance").queue(BigInt($("proposalId").value))); }
async function executeProposal() { await send("Execute proposal", () => requireContract("governance").execute(BigInt($("proposalId").value))); }

async function vaultDeposit() { const amount = eth($("vaultDepositAssets").value); if (await approve(requireContract("campaignToken"), addresses.treasuryVault, amount)) await send("Vault deposit", () => requireContract("treasuryVault").deposit(amount, account)); }
async function vaultMint() { const amount = eth($("vaultMintShares").value); if (await approve(requireContract("campaignToken"), addresses.treasuryVault, amount)) await send("Vault mint", () => requireContract("treasuryVault").mint(amount, account)); }
async function vaultWithdraw() { await send("Vault withdrawal", () => requireContract("treasuryVault").withdraw(eth($("vaultAmount").value), account, account)); }
async function vaultRedeem() { await send("Vault redemption", () => requireContract("treasuryVault").redeem(eth($("vaultAmount").value), account, account)); }

async function lookupPair() {
  try { const pair = await requireContract("dexFactory").getPair($("pairTokenA").value, $("pairTokenB").value); $("pairDetails").textContent = pair === ethers.ZeroAddress ? "Pair does not exist." : pair; }
  catch (error) { $("pairDetails").textContent = errorText(error); }
}
async function createPair() { await send("Create DEX pair", () => requireContract("dexFactory").createPair($("createPairA").value, $("createPairB").value)); }
async function routerAddLiquidity() {
  const a = eth($("routerAmountA").value), b = eth($("routerAmountB").value), recipient = addressOrAccount($("routerRecipient").value);
  const tokenA = $("routerTokenA").value.trim(), tokenB = $("routerTokenB").value.trim();
  if (!valid(tokenA) || !valid(tokenB)) throw new Error("Enter valid Token A and Token B addresses.");
  const router = requireContract("dexRouter");
  if (await approve(new ethers.Contract(tokenA, ABIS.erc20, signer), addresses.dexRouter, a) &&
      await approve(new ethers.Contract(tokenB, ABIS.erc20, signer), addresses.dexRouter, b)) {
    await send("Add DEX liquidity", () => router.addLiquidity(tokenA, tokenB, a, b, 0, 0, recipient, BigInt(Math.floor(Date.now() / 1000) + 3600)));
  }
}
async function routerSwap() {
  const path = $("routerPath").value.split(",").map(value => value.trim()), amount = eth($("routerAmountIn").value);
  if (!path.every(valid)) throw new Error("Enter a valid comma-separated token path.");
  if (await approve(new ethers.Contract(path[0], ABIS.erc20, signer), addresses.dexRouter, amount)) await send("DEX swap", () => requireContract("dexRouter").swapExactTokensForTokens(amount, eth($("routerMinOut").value), path, account, BigInt(Math.floor(Date.now() / 1000) + 3600)));
}

async function transferCft() { await send("Transfer CFT", () => requireContract("campaignToken").transfer($("tokenRecipient").value, eth($("tokenAmount").value))); }
async function burnCft() { await send("Burn CFT", () => requireContract("campaignToken").burn(eth($("tokenAmount").value))); }
async function setMinter() { await send("Set token minter", () => requireContract("campaignToken").setMinter($("newMinter").value)); }
async function readOracle() {
  try { const [price, decimals] = await requireContract("priceOracle").latestPrice(); $("oracleDetails").textContent = `Latest price: ${price.toString()} (feed decimals: ${decimals})`; }
  catch (error) { $("oracleDetails").textContent = errorText(error); }
}
async function setMockAnswer() { await send("Update mock price", () => requireContract("mockPriceFeed").setAnswer(BigInt($("mockAnswer").value))); }
async function flashLoan() { await send("Flash loan", () => requireContract("flashLoanDemo").flashLoan($("flashToken").value, eth($("flashAmount").value), $("flashReceiver").value, $("flashData").value || "0x")); }

async function consoleCall() {
  try {
    const name = $("consoleContract").value, signature = $("consoleSignature").value.trim();
    if (!signature) throw new Error("Enter a function signature.");
    const iface = new ethers.Interface([`function ${signature}`]);
    const fragment = iface.fragments[0], args = JSON.parse($("consoleArgs").value || "[]");
    const contract = new ethers.Contract(addresses[name], iface, signer);
    const result = await contract[fragment.name](...args, eth($("consoleValue").value) ? {value: eth($("consoleValue").value)} : {});
    if (result?.wait) { const receipt = await result.wait(); $("consoleResult").textContent = `Transaction confirmed: ${receipt.hash}`; }
    else $("consoleResult").textContent = JSON.stringify(result, (_, value) => typeof value === "bigint" ? value.toString() : value);
  } catch (error) { $("consoleResult").textContent = errorText(error); }
}

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(panel => panel.classList.remove("active"));
  tab.classList.add("active"); $(tab.dataset.panel).classList.add("active");
}));
