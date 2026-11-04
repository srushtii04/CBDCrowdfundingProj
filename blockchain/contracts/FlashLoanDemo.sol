// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Test-only flash-loan lender; deploy only in a local security experiment.
contract FlashLoanDemo {
    bytes32 public constant CALLBACK_SUCCESS = keccak256("FlashLoanDemo.onFlashLoan");

    function flashLoan(IERC20 token, uint256 amount, address receiver, bytes calldata data) external {
        uint256 balanceBefore = token.balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient liquidity");
        token.transfer(receiver, amount);
        (bool ok, bytes memory result) = receiver.call(data);
        require(ok && keccak256(result) == CALLBACK_SUCCESS, "Callback failed");
        require(token.balanceOf(address(this)) >= balanceBefore, "Loan not repaid");
    }
}
