import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const IntegratedDeFiModule = buildModule("IntegratedDeFiModule", (m) => {
  // 1. Contribution reward token
  const campaignToken = m.contract("CampaignToken");

  // 2. Crowdfunding with corrected 18-decimal CFT reward calculation
  const crowdfunding = m.contract("Crowdfunding", [campaignToken]);

  // 3. Transferable LP position token
  const lpToken = m.contract("LPToken");

  // 4. ETH/CFT AMM uses the same CFT and LP token deployed above
  const liquidityPool = m.contract("LiquidityPool", [campaignToken, lpToken]);

  // 5. Separate reward token, initially 1,000,000 RWD to deployer
  const rewardToken = m.contract("DemoERC20", [
    "DeFi Yield Reward",
    "RWD",
    1000000
  ]);

  // 0.1 RWD per second, in 18-decimal base units
  const rewardRate = "100000000000000000";
  const stakingFarm = m.contract("StakingFarm", [
    lpToken,
    rewardToken,
    rewardRate
  ]);

  // Configure the two restricted roles only after dependent contracts exist.
  m.call(campaignToken, "setMinter", [crowdfunding]);
  m.call(lpToken, "setPool", [liquidityPool]);

  // Fund the farm with 10,000 RWD from the deployer's initial supply.
  const rewardFunding = "10000000000000000000000";
  m.call(rewardToken, "transfer", [stakingFarm, rewardFunding]);

  return {
    campaignToken,
    crowdfunding,
    lpToken,
    liquidityPool,
    rewardToken,
    stakingFarm
  };
});

export default IntegratedDeFiModule;
