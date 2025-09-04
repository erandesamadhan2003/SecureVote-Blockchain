// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./ElectionManager.sol";
import "./VotingEngine.sol";
import "./CandidateManager.sol";
import "./VoterRegistry.sol";

contract ResultCalculator is ReentrancyGuard {
    // state variables
    VotingEngine public votingEngine;
    ElectionManager public electionManager;
    CandidateManager public candidateManager;
    VoterRegistry public voterRegistry;
    address public factory;

    bool public resultFinalized;
    bool public paused;
    uint256 public winningCandidateId;
    mapping(uint256 => uint256) public finalTally;

    // events
    event ResultFinalized(uint256 winningCandidateId, uint256 votes);
    event CandidateResult(uint256 candidateId, uint256 votes);
    event Paused(address account);
    event Unpaused(address account);

    // modifiers
    modifier onlyElectionManager() {
        require(msg.sender == address(electionManager), "Not authorized");
        _;
    }

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

    // super admin check via factory
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

    // constructor
    constructor(address _votingEngine, address _electionManager, address _factory) {
        require(_votingEngine != address(0), "Invalid VotingEngine address");
        require(_electionManager != address(0), "Invalid ElectionManager address");
        require(_factory != address(0), "Invalid Factory address");

        votingEngine = VotingEngine(_votingEngine);
        electionManager = ElectionManager(_electionManager);
        factory = _factory;
    }

    // finalize results
    function finalizeResults() external onlyElectionManager whenNotPaused {
        require(!resultFinalized, "Result already finalized");

        CandidateManager cm = votingEngine.candidateManager();
        uint256 totalCandidates = cm.candidateCounter();
        uint256 maxVotes = 0;

        for (uint256 i = 1; i <= totalCandidates; i++) {
            uint256 votes = votingEngine.totalFor(i);
            finalTally[i] = votes;
            emit CandidateResult(i, votes);

            if (votes > maxVotes) {
                maxVotes = votes;
                winningCandidateId = i;
            }
        }

        resultFinalized = true;
        emit ResultFinalized(winningCandidateId, maxVotes);

        // TODO: electionManager.setPhase(Phase.ResultsDeclared);
    }

    // view functions
    function getWinner() public view returns (uint256 candidateId, uint256 votes) {
        require(resultFinalized, "Results not finalized yet");
        return (winningCandidateId, finalTally[winningCandidateId]);
    }

    function getCandidateResult(uint256 candidateId) public view returns (uint256 votes) {
        require(resultFinalized, "Results not finalized yet");
        return finalTally[candidateId];
    }

    function getAllResults() public view returns (uint256[] memory candidateIds, uint256[] memory votes) {
        require(resultFinalized, "Results not finalized yet");

        CandidateManager cm = votingEngine.candidateManager();
        uint256 totalCandidates = cm.candidateCounter();

        candidateIds = new uint256[](totalCandidates);
        votes = new uint256[](totalCandidates);

        for (uint256 i = 1; i <= totalCandidates; i++) {
            candidateIds[i - 1] = i;
            votes[i - 1] = finalTally[i];
        }
    }

    // admin functions
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
