// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StakingFarm is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant PRECISION = 1e18;

    IERC20 public immutable stakingToken; // LPToken
    IERC20 public immutable rewardToken;  // RWD
    uint256 public immutable rewardPerSecond;

    uint256 public totalStaked;
    uint256 public lastRewardTime;
    uint256 public accRewardPerShare;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    mapping(address => UserInfo) public userInfo;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardsFunded(address indexed funder, uint256 amount);

    error ZeroAmount();
    error InsufficientStake();
    error InsufficientRewardFunding();

    constructor(address lpTokenAddress, address rewardTokenAddress, uint256 rate) {
        require(lpTokenAddress != address(0), "Invalid LP token");
        require(rewardTokenAddress != address(0), "Invalid reward token");
        require(lpTokenAddress != rewardTokenAddress, "Tokens must differ");
        require(rate > 0, "Rate must be positive");

        stakingToken = IERC20(lpTokenAddress);
        rewardToken = IERC20(rewardTokenAddress);
        rewardPerSecond = rate;
        lastRewardTime = block.timestamp;
    }

    function fundRewards(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsFunded(msg.sender, amount);
    }

    function updatePool() public {
        uint256 nowTime = block.timestamp;
        if (nowTime <= lastRewardTime) return;

        if (totalStaked == 0) {
            lastRewardTime = nowTime;
            return;
        }

        uint256 reward = (nowTime - lastRewardTime) * rewardPerSecond;
        accRewardPerShare += (reward * PRECISION) / totalStaked;
        lastRewardTime = nowTime;
    }

    function pendingReward(address user) external view returns (uint256) {
        UserInfo memory u = userInfo[user];
        uint256 acc = accRewardPerShare;

        if (block.timestamp > lastRewardTime && totalStaked > 0) {
            uint256 reward = (block.timestamp - lastRewardTime) * rewardPerSecond;
            acc += (reward * PRECISION) / totalStaked;
        }

        uint256 accrued = (u.amount * acc) / PRECISION;
        return accrued > u.rewardDebt ? accrued - u.rewardDebt : 0;
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        updatePool();
        UserInfo storage u = userInfo[msg.sender];
        _settle(msg.sender, u);

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        u.amount += amount;
        totalStaked += amount;
        u.rewardDebt = (u.amount * accRewardPerShare) / PRECISION;

        emit Staked(msg.sender, amount);
    }

    function claim() external nonReentrant {
        updatePool();
        UserInfo storage u = userInfo[msg.sender];
        _settle(msg.sender, u);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        updatePool();
        UserInfo storage u = userInfo[msg.sender];
        if (amount > u.amount) revert InsufficientStake();

        _settle(msg.sender, u);
        u.amount -= amount;
        totalStaked -= amount;
        u.rewardDebt = (u.amount * accRewardPerShare) / PRECISION;

        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function _settle(address user, UserInfo storage u) internal {
        uint256 accrued = (u.amount * accRewardPerShare) / PRECISION;
        uint256 pending = accrued > u.rewardDebt ? accrued - u.rewardDebt : 0;
        u.rewardDebt = accrued;

        if (pending > 0) {
            if (rewardToken.balanceOf(address(this)) < pending) {
                revert InsufficientRewardFunding();
            }
            rewardToken.safeTransfer(user, pending);
            emit RewardClaimed(user, pending);
        }
    }
}
