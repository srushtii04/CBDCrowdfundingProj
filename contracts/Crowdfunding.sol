// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Crowdfunding {

    struct Campaign {
        address creator;
        uint goal;
        uint deadline;
        uint amountRaised;
    }

    mapping(uint => Campaign) public campaigns;
    uint public campaignCount;

    function createCampaign(uint _goal, uint _duration) public {
        campaignCount++;
        campaigns[campaignCount] = Campaign(
            msg.sender,
            _goal,
            block.timestamp + _duration,
            0
        );
    }

    function contribute(uint _id) public payable {
        Campaign storage c = campaigns[_id];
        require(block.timestamp < c.deadline, "Deadline passed");

        c.amountRaised += msg.value;
    }
}