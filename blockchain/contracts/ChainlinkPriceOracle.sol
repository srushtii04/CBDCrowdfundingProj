// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80);
}

/// @notice Validates and normalizes a Chainlink price feed.
contract ChainlinkPriceOracle {
    AggregatorV3Interface public immutable feed;
    uint256 public immutable maxAge;

    error InvalidFeed();
    error StalePrice();
    error InvalidPrice();

    constructor(address feed_, uint256 maxAge_) {
        if (feed_ == address(0) || maxAge_ == 0) revert InvalidFeed();
        feed = AggregatorV3Interface(feed_);
        maxAge = maxAge_;
    }

    function latestPrice() external view returns (uint256 price, uint8 feedDecimals) {
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        if (answer <= 0 || updatedAt == 0 || updatedAt > block.timestamp) {
            revert InvalidPrice();
        }
        if (block.timestamp - updatedAt > maxAge) revert StalePrice();
        return (uint256(answer), feed.decimals());
    }
}
