// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice ERC-20 LP position token. Only the configured AMM may mint/burn it.
contract LPToken is ERC20, Ownable {
    address public pool;

    error OnlyPool();
    error PoolAlreadySet();
    error ZeroAddress();

    event PoolConfigured(address indexed pool);

    constructor() ERC20("ETH-CFT Liquidity Provider Token", "ETHCFT-LP") Ownable(msg.sender) {}

    function setPool(address poolAddress) external onlyOwner {
        if (pool != address(0)) revert PoolAlreadySet();
        if (poolAddress == address(0)) revert ZeroAddress();
        pool = poolAddress;
        emit PoolConfigured(poolAddress);
    }

    modifier onlyPool() {
        if (msg.sender != pool) revert OnlyPool();
        _;
    }

    function mint(address to, uint256 amount) external onlyPool {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyPool {
        _burn(from, amount);
    }
}
