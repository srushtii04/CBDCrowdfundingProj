// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Deploy one instance as RWD. Initial supply goes to the deployer.
contract DemoERC20 is ERC20, Ownable {
    constructor(string memory name_, string memory symbol_, uint256 initialSupplyWholeTokens)
        ERC20(name_, symbol_) Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupplyWholeTokens * 10 ** decimals());
    }

    function mint(address to, uint256 wholeTokens) external onlyOwner {
        _mint(to, wholeTokens * 10 ** decimals());
    }
}
