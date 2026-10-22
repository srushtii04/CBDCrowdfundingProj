import { network } from "hardhat";

const { ethers } = await network.connect();

const [deployer] = await ethers.getSigners();

console.log("Deployer:", deployer.address);

const balance = await ethers.provider.getBalance(deployer.address);

console.log(
  "Balance:",
  ethers.formatEther(balance),
  "ETH"
);

const networkInfo = await ethers.provider.getNetwork();

console.log(
  "Chain ID:",
  networkInfo.chainId.toString()
);