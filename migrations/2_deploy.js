const Crowdfunding = artifacts.require("Crowdfunding");
const Governance = artifacts.require("Governance");

module.exports = function(deployer) {
  deployer.deploy(Crowdfunding);
  deployer.deploy(Governance);
};