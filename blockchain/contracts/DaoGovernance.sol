// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @notice Small timelocked governance controller for demonstration deployments.
contract DaoGovernance {
    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes data;
        uint256 snapshot;
        uint256 start;
        uint256 end;
        uint256 eta;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 quorum;
        bool queued;
        bool executed;
    }

    IVotes public immutable votingToken;
    uint256 public immutable votingDelay;
    uint256 public immutable votingPeriod;
    uint256 public immutable quorumBps;
    uint256 public immutable timelockDelay;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, address indexed proposer, string description);
    event VoteCast(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event ProposalQueued(uint256 indexed id, uint256 eta);
    event ProposalExecuted(uint256 indexed id);

    error InvalidProposal();
    error VotingClosed();
    error AlreadyVoted();
    error NotReady();
    error ExecutionFailed();

    constructor(
        IVotes token_,
        uint256 delay_,
        uint256 period_,
        uint256 quorumBps_,
        uint256 timelockDelay_
    ) {
        require(address(token_) != address(0) && period_ > 0 && quorumBps_ <= 10_000, "Invalid config");
        votingToken = token_;
        votingDelay = delay_;
        votingPeriod = period_;
        quorumBps = quorumBps_;
        timelockDelay = timelockDelay_;
    }

    function propose(address target, uint256 value, bytes calldata data, string calldata description)
        external
        returns (uint256 id)
    {
        if (target == address(0)) revert InvalidProposal();
        // Use the last completed block so the checkpoint lookup is valid in
        // the proposal transaction itself; voting starts after the delay.
        uint256 snapshot = block.number - 1;
        id = ++proposalCount;
        uint256 supply = votingToken.getPastTotalSupply(snapshot);
        proposals[id] = Proposal(msg.sender, target, value, data, snapshot, block.number + votingDelay, block.number + votingDelay + votingPeriod, 0, 0, 0, supply * quorumBps / 10_000, false, false);
        emit ProposalCreated(id, msg.sender, description);
    }

    function vote(uint256 id, bool support) external {
        Proposal storage p = proposals[id];
        if (block.number < p.start || block.number > p.end) revert VotingClosed();
        if (hasVoted[id][msg.sender]) revert AlreadyVoted();
        uint256 weight = votingToken.getPastVotes(msg.sender, p.snapshot);
        if (weight == 0) revert InvalidProposal();
        hasVoted[id][msg.sender] = true;
        if (support) p.forVotes += weight;
        else p.againstVotes += weight;
        emit VoteCast(id, msg.sender, support, weight);
    }

    function queue(uint256 id) external {
        Proposal storage p = proposals[id];
        if (block.number <= p.end || p.forVotes <= p.againstVotes || p.forVotes + p.againstVotes < p.quorum) {
            revert InvalidProposal();
        }
        p.queued = true;
        p.eta = block.timestamp + timelockDelay;
        emit ProposalQueued(id, p.eta);
    }

    function execute(uint256 id) external payable {
        Proposal storage p = proposals[id];
        if (!p.queued || p.executed || block.timestamp < p.eta) revert NotReady();
        p.executed = true;
        (bool ok,) = p.target.call{value: p.value}(p.data);
        if (!ok) revert ExecutionFailed();
        emit ProposalExecuted(id);
    }
}
