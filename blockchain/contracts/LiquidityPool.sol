// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILPToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

contract LiquidityPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token; // CFT
    ILPToken public immutable lpToken;

    uint256 public reserveETH;
    uint256 public reserveToken;

    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;

    error InvalidToken();
    error InvalidAmount();
    error InsufficientLiquidity();
    error InsufficientOutput();
    error SlippageExceeded();
    error InsufficientShares();
    error TransferFailed();

    event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 tokenAmount, uint256 lpShares);
    event LiquidityRemoved(address indexed provider, uint256 ethAmount, uint256 tokenAmount, uint256 lpShares);
    event Swap(address indexed trader, bool ethToToken, uint256 amountIn, uint256 amountOut);

    constructor(address cftAddress, address lpTokenAddress) {
        if (cftAddress == address(0) || lpTokenAddress == address(0)) revert InvalidToken();
        token = IERC20(cftAddress);
        lpToken = ILPToken(lpTokenAddress);
    }

    function addLiquidity(uint256 tokenAmount)
        external payable nonReentrant returns (uint256 shares)
    {
        uint256 ethAmount = msg.value;
        if (ethAmount == 0 || tokenAmount == 0) revert InvalidAmount();

        uint256 supply = IERC20(address(lpToken)).totalSupply();

        if (supply == 0) {
            shares = Math.sqrt(ethAmount * tokenAmount);
        } else {
            if (reserveETH == 0 || reserveToken == 0) revert InsufficientLiquidity();
            uint256 ethOptimalShares = (ethAmount * supply) / reserveETH;
            uint256 tokenOptimalShares = (tokenAmount * supply) / reserveToken;
            shares = Math.min(ethOptimalShares, tokenOptimalShares);
        }

        if (shares == 0) revert InsufficientShares();

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        reserveETH += ethAmount;
        reserveToken += tokenAmount;
        lpToken.mint(msg.sender, shares);

        emit LiquidityAdded(msg.sender, ethAmount, tokenAmount, shares);
    }

    function removeLiquidity(uint256 shares)
        external nonReentrant returns (uint256 ethAmount, uint256 tokenAmount)
    {
        if (shares == 0) revert InsufficientShares();

        uint256 supply = IERC20(address(lpToken)).totalSupply();
        if (supply == 0 || shares > IERC20(address(lpToken)).balanceOf(msg.sender)) {
            revert InsufficientShares();
        }

        ethAmount = (shares * reserveETH) / supply;
        tokenAmount = (shares * reserveToken) / supply;
        if (ethAmount == 0 && tokenAmount == 0) revert InsufficientLiquidity();

        // Burn caller's LP tokens. Since this contract is the only burner, no allowance is needed.
        lpToken.burn(msg.sender, shares);
        reserveETH -= ethAmount;
        reserveToken -= tokenAmount;

        if (tokenAmount > 0) token.safeTransfer(msg.sender, tokenAmount);
        if (ethAmount > 0) {
            (bool ok,) = payable(msg.sender).call{value: ethAmount}("");
            if (!ok) revert TransferFailed();
        }

        emit LiquidityRemoved(msg.sender, ethAmount, tokenAmount, shares);
    }

    function swapETHForToken(uint256 minAmountOut)
        external
        payable
        nonReentrant
        returns (uint256 amountOut)
    {
        uint256 amountIn = msg.value;
        if (amountIn == 0) revert InvalidAmount();
        if (reserveETH == 0 || reserveToken == 0) revert InsufficientLiquidity();

        amountOut = getAmountOut(amountIn, reserveETH, reserveToken);
        if (amountOut == 0 || amountOut >= reserveToken) revert InsufficientOutput();
        if (amountOut < minAmountOut) revert SlippageExceeded();

        reserveETH += amountIn;
        reserveToken -= amountOut;
        token.safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, true, amountIn, amountOut);
    }

    function swapTokenForETH(uint256 tokenAmount, uint256 minAmountOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        if (tokenAmount == 0) revert InvalidAmount();
        if (reserveETH == 0 || reserveToken == 0) revert InsufficientLiquidity();

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        amountOut = getAmountOut(tokenAmount, reserveToken, reserveETH);
        if (amountOut == 0 || amountOut >= reserveETH) revert InsufficientOutput();
        if (amountOut < minAmountOut) revert SlippageExceeded();

        reserveToken += tokenAmount;
        reserveETH -= amountOut;
        (bool ok,) = payable(msg.sender).call{value: amountOut}("");
        if (!ok) revert TransferFailed();

        emit Swap(msg.sender, false, tokenAmount, amountOut);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public pure returns (uint256)
    {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) return 0;
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * FEE_DENOMINATOR + amountInWithFee;
        return numerator / denominator;
    }

    function getK() external view returns (uint256) {
        return reserveETH * reserveToken;
    }

    receive() external payable {
        revert("Use AMM functions");
    }
}
