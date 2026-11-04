import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Core platform modules", function () {
  it("only lets successful contributors claim CFT once", async function () {
    const [creator, contributor] = await ethers.getSigners();
    const token = await ethers.deployContract("CampaignToken");
    const crowdfunding = await ethers.deployContract("Crowdfunding", [token]);
    await token.setMinter(crowdfunding);

    await crowdfunding.connect(creator).createCampaign(ethers.parseEther("1"), 10);
    await crowdfunding.connect(contributor).contribute(1, { value: ethers.parseEther("1") });
    await ethers.provider.send("evm_increaseTime", [11]);
    await ethers.provider.send("evm_mine");

    await crowdfunding.connect(contributor).claimTokens(1);
    expect(await token.balanceOf(contributor)).to.equal(ethers.parseEther("1000"));
    await expect(crowdfunding.connect(contributor).claimTokens(1))
      .to.be.revertedWith("Tokens already claimed");
  });

  it("refunds failed contributions without minting rewards", async function () {
    const [, contributor] = await ethers.getSigners();
    const token = await ethers.deployContract("CampaignToken");
    const crowdfunding = await ethers.deployContract("Crowdfunding", [token]);
    await token.setMinter(crowdfunding);

    await crowdfunding.createCampaign(ethers.parseEther("2"), 10);
    await crowdfunding.connect(contributor).contribute(1, { value: ethers.parseEther("1") });
    await ethers.provider.send("evm_increaseTime", [11]);
    await ethers.provider.send("evm_mine");

    await crowdfunding.connect(contributor).claimRefund(1);
    expect(await token.balanceOf(contributor)).to.equal(0n);
    expect(await crowdfunding.getContribution(1, contributor)).to.equal(0n);
  });

  it("supports ERC-4626 deposit and redeem accounting", async function () {
    const [owner] = await ethers.getSigners();
    const asset = await ethers.deployContract("DemoERC20", ["Asset", "AST", 1000]);
    const vault = await ethers.deployContract("TreasuryVault", [asset]);
    const amount = ethers.parseEther("10");

    await asset.approve(vault, amount);
    await vault.deposit(amount, owner);
    expect(await vault.totalAssets()).to.equal(amount);
    expect(await vault.convertToAssets(await vault.balanceOf(owner))).to.equal(amount);

    await vault.redeem(await vault.balanceOf(owner), owner, owner);
    expect(await asset.balanceOf(vault)).to.equal(0n);
  });

  it("rejects stale oracle data", async function () {
    const feed = await ethers.deployContract("MockPriceFeed", [8, 200000000000n]);
    const oracle = await ethers.deployContract("ChainlinkPriceOracle", [feed, 60]);

    expect(await oracle.latestPrice()).to.deep.equal([200000000000n, 8n]);
    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine");
    await expect(oracle.latestPrice()).to.be.revertedWithCustomError(oracle, "StalePrice");
  });
});
