import { JsonRpcProvider, Wallet, formatEther } from "ethers";

async function main() {
  const rpcUrl =
    process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545";

  const privateKey = process.env.GANACHE_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("GANACHE_PRIVATE_KEY is missing from .env");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  console.log("Connected to:", rpcUrl);
  console.log("Wallet address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);

  console.log("Wallet balance:", formatEther(balance), "ETH");

  const network = await provider.getNetwork();
  console.log("Chain ID:", network.chainId.toString());
}

main().catch(console.error);