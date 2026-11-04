// ============================================================
// Experiment 4 - DeFi Crowdfunding DApp
// ethers.js v6
// Sepolia and local Ganache
// ============================================================


// ------------------------------------------------------------
// CONTRACT ADDRESSES
// ------------------------------------------------------------

const CONTRACTS = {

    campaignToken:
        "0xb50204C13E3d317589c15a13049cfAC9287E7367",

    crowdfunding:
        "0x5e2FAa0976A68658D31eE8811c24DDBF6d40ABD6",

    liquidityPool:
        "0xB68FFE11249f8A4f7530181361890a0B6c9c7fB0"
};

const LOCAL_CONTRACTS = window.LOCAL_CONTRACTS || {
    campaignToken: "",
    crowdfunding: "",
    liquidityPool: ""
};


// ------------------------------------------------------------
// NETWORK
// ------------------------------------------------------------

const SEPOLIA_CHAIN_ID = 11155111;
const GANACHE_CHAIN_ID = 1337;


// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------

let provider;
let signer;

let campaignToken;
let crowdfunding;
let liquidityPool;

let account;
let activeContracts = CONTRACTS;


// ------------------------------------------------------------
// ABIs
// ------------------------------------------------------------

const CAMPAIGN_TOKEN_ABI = [

    "function balanceOf(address account) view returns (uint256)",

    "function approve(address spender, uint256 amount) returns (bool)",

    "function allowance(address owner, address spender) view returns (uint256)",

    "function decimals() view returns (uint8)",

    "function symbol() view returns (string)"

];


const CROWDFUNDING_ABI = [

    "function campaignCount() view returns (uint256)",

    "function TOKENS_PER_ETH() view returns (uint256)",

    "function createCampaign(uint256 _goal, uint256 _durationInSeconds)",

    "function contribute(uint256 _id) payable",
    "function claimTokens(uint256 _id)",

    "function claimRefund(uint256 _id)",

    "function withdrawFunds(uint256 _id)",

    "function getCampaign(uint256 _id) view returns (address creator, uint256 goal, uint256 deadline, uint256 amountRaised, bool withdrawn)",

    "function getContribution(uint256 _id, address _contributor) view returns (uint256)"

];


const LIQUIDITY_POOL_ABI = [

    "function reserveETH() view returns (uint256)",

    "function reserveToken() view returns (uint256)",

    "function totalLPShares() view returns (uint256)",

    "function lpBalance(address) view returns (uint256)",

    "function addLiquidity(uint256 tokenAmount) payable returns (uint256 lpShares)",

    "function removeLiquidity(uint256 lpShares) returns (uint256 ethAmount, uint256 tokenAmount)",

    "function swapETHForToken(uint256 minAmountOut) payable returns (uint256 amountOut)",

    "function swapTokenForETH(uint256 tokenAmount, uint256 minAmountOut) returns (uint256 amountOut)",

    "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) view returns (uint256)",

    "function getK() view returns (uint256)"

];


// ------------------------------------------------------------
// HELPER: STATUS
// ------------------------------------------------------------

function setStatus(message, type = "") {

    const box = document.getElementById("statusBox");

    box.textContent = message;

    box.className = "status";

    if (type === "success") {
        box.classList.add("success");
    }

    if (type === "error") {
        box.classList.add("error");
    }
}


// ------------------------------------------------------------
// HELPER: ERROR MESSAGE
// ------------------------------------------------------------

function getErrorMessage(error) {

    console.error(error);

    if (error?.code === 4001) {
        return "Transaction rejected by user.";
    }

    if (error?.reason) {
        return error.reason;
    }

    if (error?.shortMessage) {
        return error.shortMessage;
    }

    if (error?.message) {
        return error.message;
    }

    return "Transaction failed.";
}


// ------------------------------------------------------------
// CONNECT METAMASK
// ------------------------------------------------------------

async function connectWallet() {

    try {

        if (!window.ethereum) {

            setStatus(
                "MetaMask is not installed. Please install MetaMask first.",
                "error"
            );

            return;
        }


        setStatus("Connecting to MetaMask...");


        provider =
            new ethers.BrowserProvider(window.ethereum);


        await provider.send(
            "eth_requestAccounts",
            []
        );


        signer =
            await provider.getSigner();


        account =
            await signer.getAddress();


        const network =
            await provider.getNetwork();


        const chainId =
            Number(network.chainId);


        if (chainId !== SEPOLIA_CHAIN_ID && chainId !== GANACHE_CHAIN_ID) {

            setStatus(
                "Wrong network. Switch MetaMask to Ethereum Sepolia or Ganache (chain ID 1337).",
                "error"
            );

            return;
        }

        activeContracts =
            chainId === GANACHE_CHAIN_ID
                ? LOCAL_CONTRACTS
                : CONTRACTS;

        if (
            !ethers.isAddress(activeContracts.campaignToken) ||
            !ethers.isAddress(activeContracts.crowdfunding) ||
            !ethers.isAddress(activeContracts.liquidityPool)
        ) {
            setStatus(
                "Local contract addresses are not configured. Update frontend/local-contracts.js after deploying to Ganache.",
                "error"
            );

            return;
        }

        document.getElementById("walletAddress").textContent =
            account;

        document.getElementById("networkName").textContent =
            chainId === GANACHE_CHAIN_ID
                ? "Ganache Local (1337)"
                : "Ethereum Sepolia";


        initializeContracts();


        await refreshBalances();

        await refreshPool();


        setStatus(
            "Wallet connected successfully.",
            "success"
        );


        window.ethereum.on(
            "accountsChanged",
            handleAccountsChanged
        );


        window.ethereum.on(
            "chainChanged",
            () => window.location.reload()
        );

    }
    catch (error) {

        setStatus(
            getErrorMessage(error),
            "error"
        );
    }
}


// ------------------------------------------------------------
// ACCOUNT CHANGE
// ------------------------------------------------------------

async function handleAccountsChanged(accounts) {

    if (accounts.length === 0) {

        account = null;

        document.getElementById("walletAddress").textContent =
            "Not connected";

        return;
    }


    account = accounts[0];


    document.getElementById("walletAddress").textContent =
        account;


    signer =
        await provider.getSigner();


    initializeContracts();


    await refreshBalances();

    await refreshPool();
}


// ------------------------------------------------------------
// INITIALIZE CONTRACTS
// ------------------------------------------------------------

function initializeContracts() {

    campaignToken =
        new ethers.Contract(
            activeContracts.campaignToken,
            CAMPAIGN_TOKEN_ABI,
            signer
        );


    crowdfunding =
        new ethers.Contract(
            activeContracts.crowdfunding,
            CROWDFUNDING_ABI,
            signer
        );


    liquidityPool =
        new ethers.Contract(
            activeContracts.liquidityPool,
            LIQUIDITY_POOL_ABI,
            signer
        );
}


// ------------------------------------------------------------
// CREATE CAMPAIGN
// ------------------------------------------------------------

async function createCampaign() {

    try {

        if (!crowdfunding) {

            setStatus(
                "Connect MetaMask first.",
                "error"
            );

            return;
        }


        const goalInput =
            document.getElementById("goal").value;


        const durationInput =
            document.getElementById("duration").value;


        if (!goalInput || !durationInput) {

            setStatus(
                "Enter both goal and duration.",
                "error"
            );

            return;
        }


        const goal =
            ethers.parseEther(goalInput);


        const duration =
            BigInt(durationInput);


        setStatus(
            "Confirm the campaign creation transaction in MetaMask..."
        );


        const tx =
            await crowdfunding.createCampaign(
                goal,
                duration
            );


        setStatus(
            "Campaign transaction submitted. Waiting for confirmation..."
        );


        const receipt =
            await tx.wait();


        setStatus(
            `Campaign created successfully. Transaction: ${receipt.hash}`,
            "success"
        );

    }
    catch (error) {

        setStatus(
            getErrorMessage(error),
            "error"
        );
    }
}


// ------------------------------------------------------------
// CONTRIBUTE
// ------------------------------------------------------------

async function contribute() {

    try {

        if (!crowdfunding) {

            setStatus(
                "Connect MetaMask first.",
                "error"
            );

            return;
        }


        const idInput =
            document.getElementById("campaignId").value;


        const amountInput =
            document.getElementById("contributionAmount").value;


        if (!idInput || !amountInput) {

            setStatus(
                "Enter campaign ID and contribution amount.",
                "error"
            );

            return;
        }


        const campaignId =
            BigInt(idInput);


        const amount =
            ethers.parseEther(amountInput);


        setStatus(
            "Confirm the contribution in MetaMask..."
        );


        const tx =
            await crowdfunding.contribute(
                campaignId,
                {
                    value: amount
                }
            );


        setStatus(
            "Contribution submitted. Waiting for confirmation..."
        );


        const receipt =
            await tx.wait();


        await refreshBalances();


        setStatus(
            `Contribution successful. Claim CFT after the campaign reaches its goal. Transaction: ${receipt.hash}`,
            "success"
        );

    }

    catch (error) {

        setStatus(
            getErrorMessage(error),
            "error"
        );
    }
}

async function claimCampaignTokens() {
    try {
        if (!crowdfunding) {
            setStatus("Connect MetaMask first.", "error");
            return;
        }
        const idInput = document.getElementById("claimCampaignId").value;
        if (!idInput) {
            setStatus("Enter a campaign ID.", "error");
            return;
        }
        setStatus("Confirm the CFT claim in MetaMask...");
        const tx = await crowdfunding.claimTokens(BigInt(idInput));
        const receipt = await tx.wait();
        await refreshBalances();
        setStatus(`CFT claimed successfully. Transaction: ${receipt.hash}`, "success");
    } catch (error) {
        setStatus(getErrorMessage(error), "error");
    }
}


// ------------------------------------------------------------
// REFRESH CFT BALANCE
// ------------------------------------------------------------

async function refreshBalances() {

    try {

        if (!campaignToken || !account) {
            return;
        }


        const balance =
            await campaignToken.balanceOf(account);


        const formatted =
            ethers.formatEther(balance);


        document.getElementById("cftBalance").textContent =
            `${formatted} CFT`;
        const dexCftBalanceElement = document.getElementById("dexCftBalance");
        if (dexCftBalanceElement) {
            dexCftBalanceElement.textContent = `${formatted} CFT`;
        }

        const ethBalance = await provider.getBalance(account);
        const ethBalanceElement = document.getElementById("ethBalance");
        if (ethBalanceElement) {
            ethBalanceElement.textContent =
                `${ethers.formatEther(ethBalance)} ETH`;
        }

    }
    catch (error) {

        console.error(
            "Balance refresh failed:",
            error
        );
    }
}


// ------------------------------------------------------------
// GET CAMPAIGN
// ------------------------------------------------------------

async function getCampaignInfo() {

    try {

        if (!crowdfunding) {

            setStatus(
                "Connect MetaMask first.",
                "error"
            );

            return;
        }


        const idInput =
            document.getElementById("viewCampaignId").value;


        if (!idInput) {

            setStatus(
                "Enter a campaign ID.",
                "error"
            );

            return;
        }


        const campaignId =
            BigInt(idInput);


        const campaign =
            await crowdfunding.getCampaign(
                campaignId
            );


        document.getElementById("campaignCreator").textContent =
            campaign[0];


        document.getElementById("campaignGoal").textContent =
            `${ethers.formatEther(campaign[1])} ETH`;


        document.getElementById("campaignRaised").textContent =
            `${ethers.formatEther(campaign[3])} ETH`;


        const deadline =
            Number(campaign[2]);


        document.getElementById("campaignDeadline").textContent =
            new Date(
                deadline * 1000
            ).toLocaleString();


        setStatus(
            "Campaign information loaded.",
            "success"
        );

    }
    catch (error) {

        setStatus(
            getErrorMessage(error),
            "error"
        );
    }
}


// ------------------------------------------------------------
// ADD LIQUIDITY
// ------------------------------------------------------------

async function addLiquidity() {

    try {

        if (!liquidityPool || !campaignToken) {

            setStatus(
                "Connect MetaMask first.",
                "error"
            );

            return;
        }


        const ethInput =
            document.getElementById("liquidityEth").value;


        const tokenInput =
            document.getElementById("liquidityToken").value;


        if (!ethInput || !tokenInput) {

            setStatus(
                "Enter both ETH and CFT amounts.",
                "error"
            );

            return;
        }


        const ethAmount =
            ethers.parseEther(ethInput);


        const tokenAmount =
            ethers.parseEther(tokenInput);


        setStatus(
            "Step 1/2: Approve CFT spending in MetaMask..."
        );


        const approvalTx =
            await campaignToken.approve(
                activeContracts.liquidityPool,
                tokenAmount
            );


        await approvalTx.wait();


        setStatus(
            "Step 2/2: Confirm liquidity deposit in MetaMask..."
        );


        const tx =
            await liquidityPool.addLiquidity(
                tokenAmount,
                {
                    value: ethAmount
                }
            );


        setStatus(
            "Liquidity transaction submitted. Waiting..."
        );


        const receipt =
            await tx.wait();


        await refreshPool();

        await refreshBalances();


        setStatus(
            `Liquidity added successfully. Transaction: ${receipt.hash}`,
            "success"
        );

    }
    catch (error) {

        setStatus(
            getErrorMessage(error),
            "error"
        );
    }
}


// ------------------------------------------------------------
// REMOVE LIQUIDITY
// ------------------------------------------------------------

async function removeLiquidity() {

    try {

        if (!liquidityPool) {

            setStatus(
                "Connect MetaMask first.",
                "error"
            );

            return;
        }


        const sharesInput =
            document.getElementById("lpShares").value;


        if (!sharesInput) {

            setStatus(
                "Enter LP shares.",
                "error"
            );

            return;
        }


        const shares =
            ethers.parseEther(sharesInput);


        setStatus(
            "Confirm liquidity removal in MetaMask..."
        );


        const tx =
            await liquidityPool.removeLiquidity(
                shares
            );


        setStatus(
            "Waiting for confirmation..."
        );


        const receipt =
            await tx.wait();


        await refreshPool();

        await refreshBalances();


        setStatus(
            `Liquidity removed successfully. Transaction: ${receipt.hash}`,
            "success"
        );

    }
    catch (error) {

        setStatus(
            getErrorMessage(error),
            "error"
        );
    }
}


// ------------------------------------------------------------
// DEX SWAP HELPERS
// ------------------------------------------------------------

async function getPoolReserves() {
    const [eth, cft] = await Promise.all([
        liquidityPool.reserveETH(),
        liquidityPool.reserveToken()
    ]);

    return { eth, cft };
}

function getSwapSlippageBps() {
    const value = Number(document.getElementById("swapSlippage").value);
    if (!Number.isFinite(value) || value < 0 || value >= 100) {
        throw new Error("Slippage must be at least 0 and less than 100 percent.");
    }

    return BigInt(Math.round(value * 100));
}

function calculateMinimumOutput(expectedOutput) {
    const slippageBps = getSwapSlippageBps();
    return (expectedOutput * (10000n - slippageBps)) / 10000n;
}

function getSwapDirection() {
    return document.getElementById("swapFrom").value === "ETH";
}

async function updateSwapEstimate() {
    const estimate = document.getElementById("swapEstimate");
    const amountInput = document.getElementById("swapAmount").value;

    if (!liquidityPool || !amountInput) {
        estimate.textContent = "-";
        return;
    }

    try {
        const amount = ethers.parseEther(amountInput);
        const reserves = await getPoolReserves();
        const ethToCft = getSwapDirection();
        const expected = await liquidityPool.getAmountOut(
            amount,
            ethToCft ? reserves.eth : reserves.cft,
            ethToCft ? reserves.cft : reserves.eth
        );

        estimate.textContent = `${ethers.formatEther(expected)} ${
            ethToCft ? "CFT" : "ETH"
        }`;
    } catch (error) {
        estimate.textContent = "Enter a valid positive amount";
    }
}

function updateSwapToToken() {
    const ethToCft = getSwapDirection();
    document.getElementById("swapTo").textContent = ethToCft ? "CFT" : "ETH";
    document.getElementById("swapAmount").placeholder =
        ethToCft ? "Example: 0.01 ETH" : "Example: 1 CFT";
    updateSwapEstimate();
}

async function swapDex() {
    try {
        if (!liquidityPool || !campaignToken || !account) {
            throw new Error("Connect MetaMask first.");
        }

        const amountInput = document.getElementById("swapAmount").value;
        if (!amountInput) {
            throw new Error("Enter a swap amount.");
        }

        const amount = ethers.parseEther(amountInput);
        if (amount <= 0n) {
            throw new Error("Swap amount must be greater than zero.");
        }

        const ethToCft = getSwapDirection();
        const reserves = await getPoolReserves();
        const reserveIn = ethToCft ? reserves.eth : reserves.cft;
        const reserveOut = ethToCft ? reserves.cft : reserves.eth;
        const expectedOutput = await liquidityPool.getAmountOut(
            amount,
            reserveIn,
            reserveOut
        );
        const minOutput = calculateMinimumOutput(expectedOutput);

        if (expectedOutput === 0n || minOutput === 0n || expectedOutput >= reserveOut) {
            throw new Error("The pool has insufficient liquidity for this swap.");
        }

        if (ethToCft) {
            const ethBalance = await provider.getBalance(account);
            if (ethBalance < amount) {
                throw new Error("Insufficient ETH balance.");
            }

            setStatus("Confirm ETH → CFT swap in MetaMask...");
            const tx = await liquidityPool.swapETHForToken(minOutput, {
                value: amount
            });
            setStatus("Swap submitted. Waiting for confirmation...");
            const receipt = await tx.wait();
            setStatus(`ETH → CFT swap successful. Transaction: ${receipt.hash}`, "success");
        } else {
            const tokenBalance = await campaignToken.balanceOf(account);
            if (tokenBalance < amount) {
                throw new Error("Insufficient CFT balance.");
            }

            setStatus("Step 1/2: Approve CFT spending...");
            const approvalTx = await campaignToken.approve(
                activeContracts.liquidityPool,
                amount
            );
            await approvalTx.wait();

            setStatus("Step 2/2: Confirm CFT → ETH swap...");
            const tx = await liquidityPool.swapTokenForETH(amount, minOutput);
            setStatus("Swap submitted. Waiting for confirmation...");
            const receipt = await tx.wait();
            setStatus(`CFT → ETH swap successful. Transaction: ${receipt.hash}`, "success");
        }

        await refreshBalances();
        await refreshPool();
        await updateSwapEstimate();
    } catch (error) {
        setStatus(getErrorMessage(error), "error");
    }
}


// ------------------------------------------------------------
// SWAP ETH -> CFT
// ------------------------------------------------------------

async function swapETHForCFT() {

    try {

        if (!liquidityPool) {

            setStatus(
                "Connect MetaMask first.",
                "error"
            );

            return;
        }


        const amountInput =
            document.getElementById("ethSwapAmount").value;


        if (!amountInput) {

            setStatus(
                "Enter ETH amount.",
                "error"
            );

            return;
        }


        const ethAmount = ethers.parseEther(amountInput);
        const reserves = await getPoolReserves();
        const expectedOutput = await liquidityPool.getAmountOut(
            ethAmount,
            reserves.eth,
            reserves.cft
        );
        const minOutput = calculateMinimumOutput(expectedOutput);
        if (expectedOutput === 0n || minOutput === 0n) {
            throw new Error("The pool cannot provide output for this amount.");
        }


        setStatus(
            "Confirm ETH → CFT swap in MetaMask..."
        );


        const tx =
            await liquidityPool.swapETHForToken(
                minOutput,
                {
                    value: ethAmount
                }
            );


        setStatus(
            "Swap submitted. Waiting for confirmation..."
        );


        const receipt =
            await tx.wait();


        await refreshBalances();

        await refreshPool();


        setStatus(
            `ETH → CFT swap successful. Transaction: ${receipt.hash}`,
            "success"
        );

    }
    catch (error) {

        setStatus(
            getErrorMessage(error),
            "error"
        );
    }
}


// ------------------------------------------------------------
// SWAP CFT -> ETH
// ------------------------------------------------------------

async function swapCFTForETH() {

    try {

        if (!liquidityPool || !campaignToken) {

            setStatus(
                "Connect MetaMask first.",
                "error"
            );

            return;
        }


        const amountInput =
            document.getElementById("cftSwapAmount").value;


        if (!amountInput) {

            setStatus(
                "Enter CFT amount.",
                "error"
            );

            return;
        }


        const tokenAmount = ethers.parseEther(amountInput);
        const reserves = await getPoolReserves();
        const expectedOutput = await liquidityPool.getAmountOut(
            tokenAmount,
            reserves.cft,
            reserves.eth
        );
        const minOutput = calculateMinimumOutput(expectedOutput);
        if (expectedOutput === 0n || minOutput === 0n) {
            throw new Error("The pool cannot provide output for this amount.");
        }


        setStatus(
            "Step 1/2: Approve CFT spending..."
        );


        const approvalTx =
            await campaignToken.approve(
                activeContracts.liquidityPool,
                tokenAmount
            );


        await approvalTx.wait();


        setStatus(
            "Step 2/2: Confirm CFT → ETH swap..."
        );


        const tx =
            await liquidityPool.swapTokenForETH(
                tokenAmount,
                minOutput
            );


        setStatus(
            "Swap submitted. Waiting for confirmation..."
        );


        const receipt =
            await tx.wait();


        await refreshBalances();

        await refreshPool();


        setStatus(
            `CFT → ETH swap successful. Transaction: ${receipt.hash}`,
            "success"
        );

    }
    catch (error) {

        setStatus(
            getErrorMessage(error),
            "error"
        );
    }
}


// ------------------------------------------------------------
// REFRESH AMM POOL
// ------------------------------------------------------------

async function refreshPool() {

    try {

        if (!liquidityPool || !account) {
            return;
        }


        const ethReserve =
            await liquidityPool.reserveETH();


        const tokenReserve =
            await liquidityPool.reserveToken();


        const userShares =
            await liquidityPool.lpBalance(
                account
            );


        const totalShares =
            await liquidityPool.totalLPShares();


        const k =
            await liquidityPool.getK();


        document.getElementById("reserveETH").textContent =
            `${ethers.formatEther(ethReserve)} ETH`;


        document.getElementById("reserveCFT").textContent =
            `${ethers.formatEther(tokenReserve)} CFT`;


        document.getElementById("userLPShares").textContent =
            ethers.formatEther(userShares);


        document.getElementById("totalLPShares").textContent =
            ethers.formatEther(totalShares);


        document.getElementById("poolK").textContent =
            k.toString();

        const priceEthPerCft = ethReserve === 0n || tokenReserve === 0n
            ? 0n
            : (ethReserve * 1000000000000000000n) / tokenReserve;
        const priceCftPerEth = tokenReserve === 0n || ethReserve === 0n
            ? 0n
            : (tokenReserve * 1000000000000000000n) / ethReserve;
        document.getElementById("priceEthPerCft").textContent =
            `${ethers.formatEther(priceEthPerCft)} ETH`;
        document.getElementById("priceCftPerEth").textContent =
            `${ethers.formatEther(priceCftPerEth)} CFT`;
        await updateSwapEstimate();

    }
    catch (error) {

        console.error(
            "Pool refresh failed:",
            error
        );
    }
}


// ------------------------------------------------------------
// PAGE LOAD
// ------------------------------------------------------------

window.addEventListener(
    "load",
    () => {

        console.log(
            "Experiment 4 frontend loaded."
        );

        console.log(
            "CampaignToken:",
            activeContracts.campaignToken
        );

        console.log(
            "Crowdfunding:",
            activeContracts.crowdfunding
        );

        console.log(
            "LiquidityPool:",
            activeContracts.liquidityPool
        );
    }
);