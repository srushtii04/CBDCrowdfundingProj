
import { network } from "hardhat";

async function main() {
  // Connect to the network selected by --network
  const { ethers } = await network.connect();

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("Deployer:", await deployer.getAddress());
  console.log(
    "Balance:",
    ethers.formatEther(
      await ethers.provider.getBalance(await deployer.getAddress())
    )
  );

  const tests = [
    {
      name: "CampaignToken",
      args: [],
    },
    {
      name: "DemoERC20",
      args: ["DeFi Yield Reward", "RWD", 1000000],
    },
    {
      name: "LPToken",
      args: [],
    },
    {
      name: "MockPriceFeed",
      args: [8, 200000000000n],
    },
  ];

  for (const test of tests) {
    console.log(`\nTesting ${test.name}...`);

    try {
      const factory = await ethers.getContractFactory(
        test.name,
        deployer
      );

      const contract = await factory.deploy(...test.args);
      await contract.waitForDeployment();

      console.log(
        "SUCCESS:",
        await contract.getAddress()
      );
    } catch (error: any) {
      console.log("FAILED:", test.name);
      console.log("Error:", error);
      console.log("Reason:", error.shortMessage);
      console.log("Revert data:", error.data);
    }
  }
}

main().catch(console.error);
