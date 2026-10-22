const Crowdfunding = artifacts.require("Crowdfunding");
const Governance = artifacts.require("Governance");

module.exports = async function(deployer) {
  await deployer.deploy(Crowdfunding);
  const crowdfunding = await Crowdfunding.deployed();

  await deployer.deploy(Governance, crowdfunding.address);
};