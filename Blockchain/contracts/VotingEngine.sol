// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ElectionManager.sol";
import "./VoterRegistry.sol";
import "./CandidateManager.sol";

contract VotingEngine {

    ElectionManager public electionManager;
    VoterRegistry public voterRegistry;
    CandidateManager public candidateManager;
    address public factory;

    //enums
    enum VoteMode {Direct, CommitReveal}

    //state variables
    mapping(address => bytes32) public voteCommit;
    mapping(address => bool) public revealed;
    bool public paused; 

    // MODIFIERS
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyManagerOrSuperAdmin() {
        require(
            msg.sender == address(electionManager) || isFactorySuperAdmin(msg.sender),
            "Not authorized"
        );
        _;
    }

    modifier onlySuperAdmin() {
        require(isFactorySuperAdmin(msg.sender), "Not super Admin");
        _;
    }

    function isFactorySuperAdmin(address account) public view returns (bool) {
        (bool success, bytes memory result) = factory.staticcall(
            abi.encodeWithSignature(
                "hasRole(bytes32,address)",
                keccak256("SUPER_ADMIN"),
                account
            )
        );
        return success && abi.decode(result, (bool));
    }

    // EVENTS
    event VoteCast(address voter, uint256 candidateId);
    event VoteCommitted(address voter, bytes32 commitment);
    event VoteRevealed(address voter, uint256 candidateId);
    event Paused(address account);
    event Unpaused(address account);

    // CONSTRUCTOR
    constructor(
        address _electionManager,
        address _voterRegistry,
        address _candidateManager,
        address _factory
    ) {
        electionManager = ElectionManager(_electionManager);
        voterRegistry = VoterRegistry(_voterRegistry);
        candidateManager = CandidateManager(_candidateManager);
        factory = _factory;
    }



    function castVote(uint256 candidateId) external whenNotPaused {
        require(
            electionManager.getCurrentPhase(1) == ElectionManager.ElectionPhase.Voting,
            "Voting phase not active"
        );
        require(voterRegistry.canVote(msg.sender), "Voter is not eligible");
        require(candidateManager.isCandidateApproved(candidateId), "Candidate not verified");

        voterRegistry.markVoted(msg.sender);
        candidateManager.incrementVote(candidateId);

        emit VoteCast(msg.sender, candidateId);
    }

    function commitVote(bytes32 commitment) external whenNotPaused {
        require(
            electionManager.getCurrentPhase(1) == ElectionManager.ElectionPhase.Voting,
            "Voting phase not active"
        );
        require(voterRegistry.canVote(msg.sender), "Voter is not eligible");
        require(voteCommit[msg.sender] == bytes32(0), "Vote already committed");

        voteCommit[msg.sender] = commitment;

        emit VoteCommitted(msg.sender, commitment);
    }

    function revealVote(uint256 candidateId, bytes32 nounce) external whenNotPaused {
        require(voteCommit[msg.sender] != bytes32(0), "Vote is not committed yet");
        require(!revealed[msg.sender], "Vote already revealed");

        bytes32 computedhash = keccak256(abi.encodePacked(candidateId, nounce));
        require(computedhash == voteCommit[msg.sender], "Commitment mismatch");
        require(candidateManager.isCandidateApproved(candidateId), "Candidate not verified");

        candidateManager.incrementVote(candidateId);
        revealed[msg.sender] = true;

        emit VoteRevealed(msg.sender, candidateId);
    }

    function totalFor(uint256 candidateId) public view returns (uint256) {
        CandidateManager.Candidate memory candidate = candidateManager.getCandidateInfo(candidateId);
        return candidate.voteCount;
    }


    function pause() external onlyManagerOrSuperAdmin {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyManagerOrSuperAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function setAddresses(
        address _electionManager,
        address _voterRegistry,
        address _candidateManager
    ) external onlySuperAdmin {
        electionManager = ElectionManager(_electionManager);
        voterRegistry = VoterRegistry(_voterRegistry);
        candidateManager = CandidateManager(_candidateManager);
    }
}
