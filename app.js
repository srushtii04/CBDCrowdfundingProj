let web3;
let contract;

const contractAddress = "0x678E77AaDDad73a154EFc55b162037d95d17f865";

//const abi = [ /* paste ABI here */ ];

async function connectWallet() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        const response = await fetch("build/contracts/Crowdfunding.json");
        const data = await response.json();

        const abi = data.abi;

        contract = new web3.eth.Contract(abi, contractAddress);
        alert("Wallet Connected");
    }
}

async function createCampaign() {
    const accounts = await web3.eth.getAccounts();

    const goal = document.getElementById("goal").value;
    const duration = document.getElementById("duration").value;

    await contract.methods.createCampaign(goal, duration).send({
        from: accounts[0]
    });

    alert("Campaign Created");
}

async function contribute() {
    const accounts = await web3.eth.getAccounts();

    const id = document.getElementById("campaignId").value;
    const amount = document.getElementById("amount").value;

    await contract.methods.contribute(id).send({
        from: accounts[0],
        value: amount
    });

    alert("Contribution Done");
}