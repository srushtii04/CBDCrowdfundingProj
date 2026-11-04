// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Local-only Chainlink-compatible feed for Ganache demonstrations.
contract MockPriceFeed is Ownable {
    uint8 public immutable decimals;
    int256 private answer;
    uint256 private updatedAt;

    constructor(uint8 decimals_, int256 initialAnswer)
        Ownable(msg.sender)
    {
        decimals = decimals_;
        setAnswer(initialAnswer);
    }

    function setAnswer(int256 nextAnswer) public onlyOwner {
        require(nextAnswer > 0, "Invalid price");
        answer = nextAnswer;
        updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
