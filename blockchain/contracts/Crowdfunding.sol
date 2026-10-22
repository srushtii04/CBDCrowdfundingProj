// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICampaignToken {
    function mint(address to, uint256 amount) external;
}

contract Crowdfunding {
    struct Campaign {
        address creator;
        uint256 goal;
        uint256 deadline;
        uint256 amountRaised;
        bool withdrawn;
    }

    uint256 public campaignCount;
    uint256 public constant TOKENS_PER_ETH = 1000;
    ICampaignToken public immutable campaignToken;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(uint256 indexed id, address indexed creator, uint256 goal, uint256 deadline);
    event ContributionMade(uint256 indexed id, address indexed contributor, uint256 amount, uint256 tokensReceived);
    event Withdrawn(uint256 indexed id, address indexed creator, uint256 amount);
    event Refunded(uint256 indexed id, address indexed contributor, uint256 amount);

    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "Invalid token");
        campaignToken = ICampaignToken(tokenAddress);
    }

    function createCampaign(uint256 goal, uint256 durationSeconds) external {
        require(goal > 0, "Goal must be positive");
        require(durationSeconds > 0, "Duration must be positive");

        uint256 id = ++campaignCount;
        uint256 deadline = block.timestamp + durationSeconds;

        campaigns[id] = Campaign({
            creator: msg.sender,
            goal: goal,
            deadline: deadline,
            amountRaised: 0,
            withdrawn: false
        });

        emit CampaignCreated(id, msg.sender, goal, deadline);
    }

    function contribute(uint256 id) external payable {
        Campaign storage c = campaigns[id];
        require(c.creator != address(0), "Campaign does not exist");
        require(msg.value > 0, "Must send ETH");
        require(block.timestamp < c.deadline, "Campaign has ended");

        c.amountRaised += msg.value;
        contributions[id][msg.sender] += msg.value;

        // 1 ETH => 1000 CFT. CFT has 18 decimals, so do not divide by 1 ether.
        uint256 tokenAmount = msg.value * TOKENS_PER_ETH;
        campaignToken.mint(msg.sender, tokenAmount);

        emit ContributionMade(id, msg.sender, msg.value, tokenAmount);
    }

    function withdrawFunds(uint256 id) external {
        Campaign storage c = campaigns[id];
        require(msg.sender == c.creator, "Only creator");
        require(block.timestamp >= c.deadline, "Campaign active");
        require(c.amountRaised >= c.goal, "Goal not reached");
        require(!c.withdrawn, "Already withdrawn");

        c.withdrawn = true;
        uint256 amount = c.amountRaised;
        (bool ok,) = payable(c.creator).call{value: amount}("");
        require(ok, "Transfer failed");

        emit Withdrawn(id, c.creator, amount);
    }

    function claimRefund(uint256 id) external {
        Campaign storage c = campaigns[id];
        require(block.timestamp >= c.deadline, "Campaign active");
        require(c.amountRaised < c.goal, "Goal reached");

        uint256 amount = contributions[id][msg.sender];
        require(amount > 0, "No contribution");

        contributions[id][msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");

        emit Refunded(id, msg.sender, amount);
    }

    function getCampaign(uint256 id)
        external view
        returns (address creator, uint256 goal, uint256 deadline, uint256 amountRaised, bool withdrawn)
    {
        Campaign memory c = campaigns[id];
        return (c.creator, c.goal, c.deadline, c.amountRaised, c.withdrawn);
    }

    function getContribution(uint256 id, address contributor) external view returns (uint256) {
        return contributions[id][contributor];
    }
}
