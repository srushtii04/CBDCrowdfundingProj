// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract DexPair is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    address public constant LOCKED_LIQUIDITY = address(0x000000000000000000000000000000000000dEaD);
    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;

    address public immutable factory;
    address public token0;
    address public token1;
    uint112 private reserve0;
    uint112 private reserve1;
    bool private initialized;

    error Forbidden();
    error AlreadyInitialized();
    error InvalidTokens();
    error InvalidAmount();
    error InsufficientLiquidity();
    error InsufficientInputAmount();
    error InsufficientOutputAmount();
    error K();

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    constructor() ERC20("DEX Liquidity Provider", "DEX-LP") {
        factory = msg.sender;
    }

    function initialize(address tokenA, address tokenB) external {
        if (msg.sender != factory) revert Forbidden();
        if (initialized) revert AlreadyInitialized();
        if (tokenA == address(0) || tokenB == address(0) || tokenA == tokenB) {
            revert InvalidTokens();
        }
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        initialized = true;
    }

    function getReserves() external view returns (uint112, uint112) {
        return (reserve0, reserve1);
    }

    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1) = (reserve0, reserve1);
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;
        if (amount0 == 0 || amount1 == 0) revert InvalidAmount();

        uint256 supply = totalSupply();
        if (supply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            if (liquidity == 0) revert InsufficientLiquidity();
            _mint(LOCKED_LIQUIDITY, MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.min(
                (amount0 * supply) / _reserve0,
                (amount1 * supply) / _reserve1
            );
        }
        if (liquidity == 0) revert InsufficientLiquidity();

        _mint(to, liquidity);
        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    function burn(address to)
        external
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        uint256 liquidity = balanceOf(address(this));
        uint256 supply = totalSupply();
        (uint112 _reserve0, uint112 _reserve1) = (reserve0, reserve1);
        amount0 = (liquidity * _reserve0) / supply;
        amount1 = (liquidity * _reserve1) / supply;
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        _burn(address(this), liquidity);
        IERC20(token0).safeTransfer(to, amount0);
        IERC20(token1).safeTransfer(to, amount1);
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to
    ) external nonReentrant {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();
        if (amount0Out >= reserve0 || amount1Out >= reserve1) {
            revert InsufficientLiquidity();
        }
        if (to == token0 || to == token1 || to == address(this)) revert InvalidTokens();

        if (amount0Out > 0) IERC20(token0).safeTransfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).safeTransfer(to, amount1Out);

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0In = balance0 > uint256(reserve0) - amount0Out
            ? balance0 - (uint256(reserve0) - amount0Out)
            : 0;
        uint256 amount1In = balance1 > uint256(reserve1) - amount1Out
            ? balance1 - (uint256(reserve1) - amount1Out)
            : 0;
        if (amount0In == 0 && amount1In == 0) revert("INSUFFICIENT_INPUT_AMOUNT");

        uint256 balance0Adjusted =
            balance0 * FEE_DENOMINATOR - amount0In * (FEE_DENOMINATOR - FEE_NUMERATOR);
        uint256 balance1Adjusted =
            balance1 * FEE_DENOMINATOR - amount1In * (FEE_DENOMINATOR - FEE_NUMERATOR);
        if (
            balance0Adjusted * balance1Adjusted
                < uint256(reserve0) * uint256(reserve1) * FEE_DENOMINATOR ** 2
        ) revert("K");

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function _update(uint256 balance0, uint256 balance1) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) {
            revert InsufficientLiquidity();
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        emit Sync(reserve0, reserve1);
    }
}
