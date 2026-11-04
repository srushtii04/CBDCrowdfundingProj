// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DexFactory.sol";
import "./DexPair.sol";

contract DexRouter {
    using SafeERC20 for IERC20;

    DexFactory public immutable factory;

    error Expired();
    error InsufficientA();
    error InsufficientB();
    error InvalidPath();
    error InsufficientOutput();
    error PairNotFound();

    constructor(address factoryAddress) {
        factory = DexFactory(factoryAddress);
    }

    function sortTokens(address tokenA, address tokenB)
        public
        pure
        returns (address token0, address token1)
    {
        if (tokenA == tokenB || tokenA == address(0) || tokenB == address(0)) {
            revert InvalidPath();
        }
        return tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    function getReserves(address tokenA, address tokenB)
        public
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        address pair = factory.getPair(token0, token1);
        if (pair == address(0)) revert PairNotFound();
        (uint112 reserve0, uint112 reserve1) = DexPair(pair).getReserves();
        return tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB)
        public
        pure
        returns (uint256 amountB)
    {
        if (amountA == 0 || reserveA == 0 || reserveB == 0) revert InsufficientA();
        return (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) revert InsufficientA();
        uint256 amountInWithFee = amountIn * 997;
        return (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i = 0; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        if (block.timestamp > deadline) revert("EXPIRED");
        address pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = factory.createPair(tokenA, tokenB);
        }
        (uint256 reserveA, uint256 reserveB) = _getReservesOrZero(tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin) revert InsufficientB();
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                if (amountAOptimal < amountAMin) revert InsufficientA();
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }
        if (amountA < amountAMin || amountB < amountBMin) revert InsufficientA();
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);
        liquidity = DexPair(pair).mint(to);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        if (block.timestamp > deadline) revert("EXPIRED");
        address pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) revert PairNotFound();
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = DexPair(pair).burn(to);
        (address token0,) = sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
        if (amountA < amountAMin) revert InsufficientA();
        if (amountB < amountBMin) revert InsufficientB();
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        if (block.timestamp > deadline) revert("EXPIRED");
        if (path.length < 2) revert InvalidPath();
        amounts = this.getAmountsOut(amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin) revert InsufficientOutput();

        address firstPair = factory.getPair(path[0], path[1]);
        if (firstPair == address(0)) revert PairNotFound();
        IERC20(path[0]).safeTransferFrom(msg.sender, firstPair, amounts[0]);
        _swap(amounts, path, to);
    }

    function _swap(
        uint256[] memory amounts,
        address[] calldata path,
        address to
    ) private {
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address token0,) = sortTokens(path[i], path[i + 1]);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = path[i] == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address recipient = i < path.length - 2
                ? factory.getPair(path[i + 1], path[i + 2])
                : to;
            DexPair(factory.getPair(path[i], path[i + 1])).swap(
                amount0Out,
                amount1Out,
                recipient
            );
        }
    }

    function _getReservesOrZero(address tokenA, address tokenB)
        private
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        address pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) return (0, 0);
        return getReserves(tokenA, tokenB);
    }
}
