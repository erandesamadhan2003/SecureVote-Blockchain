// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Roles.sol";

contract Election is ReentrancyGuard {
    Roles public roles;
    address public electionManager;
    
    // ! ==================== ENUMS ====================
    
    enum ElectionStatus { Created, Registration, Voting, Ended, ResultDeclared }
    enum CandidateStatus { Pending, Approved, Rejected }
    
    // ! ==================== STRUCTS ====================
    
    struct Candidate {
        uint256 id;
        address candidateAddress;
        string name;
        string party;
        string manifesto;
        string imageHash; // IPFS hash
        CandidateStatus status;
        uint256 voteCount;
        bool exists;
    }
    
    struct VoterInfo {
        bool isRegistered;
        bool hasVoted;
        uint256 votedCandidateId;
        uint256 registrationTime;
    }
    
    struct ElectionInfo {
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 registrationDeadline;
        ElectionStatus status;
        uint256 totalVotes;
        uint256 totalCandidates;
    }

    // ! ==================== STATE VARIABLES ====================

    ElectionInfo public electionInfo;
    uint256 private candidateIdCounter;
    
    mapping(uint256 => Candidate) public candidates;
    mapping(address => VoterInfo) public voters;
    mapping(address => uint256) public candidateAddressToId;
    
    uint256[] public candidateIds;
    address[] public voterAddresses;

    // ! ==================== EVENTS ====================

    event ElectionCreated(string name, uint256 startTime, uint256 endTime);
    event ElectionStatusChanged(ElectionStatus oldStatus, ElectionStatus newStatus);
    event CandidateRegistered(uint256 indexed candidateId, address indexed candidateAddress, string name);
    event CandidateValidated(uint256 indexed candidateId, CandidateStatus status);
    event VoterRegistered(address indexed voter);
    event VoteCasted(address indexed voter, uint256 indexed candidateId);
    event ResultDeclared(uint256 winnerCandidateId, uint256 totalVotes);

    // ! ==================== MODIFIERS ====================

    modifier onlyElectionManager() {
        require(msg.sender == electionManager, "Only election manager");
        _;
    }

    modifier onlyElectionAuthorityOrManager() {
        require(
            roles.hasRole(roles.ELECTION_AUTHORITY(), msg.sender) || msg.sender == electionManager,
            "Only authority or manager"
        );
        _;
    }

    modifier onlyVoter() {
        require(roles.hasRole(roles.VOTER(), msg.sender), "Only registered voter");
        _;
    }

    modifier inStatus(ElectionStatus _status) {
        require(electionInfo.status == _status, "Invalid election status");
        _;
    }

    // ! ==================== CONSTRUCTOR ====================

    constructor(
        address _rolesContract,
        address _electionManager,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _registrationDeadline
    ) {
        require(_rolesContract != address(0), "Invalid roles contract");
        require(_electionManager != address(0), "Invalid manager");
        require(_startTime > block.timestamp, "Start time must be in future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_registrationDeadline < _startTime, "Registration must end before voting starts");
        require(bytes(_name).length > 0, "Name required");
        
        roles = Roles(_rolesContract);
        electionManager = _electionManager;
        
        electionInfo = ElectionInfo({
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            registrationDeadline: _registrationDeadline,
            status: ElectionStatus.Created,
            totalVotes: 0,
            totalCandidates: 0
        });

        candidateIdCounter = 0;

        emit ElectionCreated(_name, _startTime, _endTime);
    }

    // ! ==================== ELECTION MANAGEMENT ====================
    
    function startCandidateRegistration() external onlyElectionManager inStatus(ElectionStatus.Created) {
        require(block.timestamp < electionInfo.registrationDeadline, "Registration deadline passed");
        _changeStatus(ElectionStatus.Registration);
    }

    function startVoting() external onlyElectionManager inStatus(ElectionStatus.Registration) {
        require(block.timestamp >= electionInfo.startTime, "Voting time not reached");
        require(electionInfo.totalCandidates > 0, "No approved candidates");
        _changeStatus(ElectionStatus.Voting);
    }

    function endElection() external onlyElectionManager inStatus(ElectionStatus.Voting) {
        require(block.timestamp >= electionInfo.endTime, "Election end time not reached");
        _changeStatus(ElectionStatus.Ended);
    }

    function declareResult() external onlyElectionManager inStatus(ElectionStatus.Ended) {
        _changeStatus(ElectionStatus.ResultDeclared);
        uint256 winnerId = getWinner();
        emit ResultDeclared(winnerId, electionInfo.totalVotes);
    }

    function _changeStatus(ElectionStatus newStatus) private {
        ElectionStatus oldStatus = electionInfo.status;
        electionInfo.status = newStatus;
        emit ElectionStatusChanged(oldStatus, newStatus);
    }

    // ! ==================== CANDIDATE MANAGEMENT ====================

    function registerCandidate(
        string memory _name,
        string memory _party,
        string memory _manifesto,
        string memory _imageHash
    ) external inStatus(ElectionStatus.Registration) {
        require(block.timestamp < electionInfo.registrationDeadline, "Registration closed");
        require(candidateAddressToId[msg.sender] == 0, "Already registered");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_party).length > 0, "Party required");

        candidateIdCounter++;
        uint256 newCandidateId = candidateIdCounter;

        candidates[newCandidateId] = Candidate({
            id: newCandidateId,
            candidateAddress: msg.sender,
            name: _name,
            party: _party,
            manifesto: _manifesto,
            imageHash: _imageHash,
            status: CandidateStatus.Pending,
            voteCount: 0,
            exists: true
        });

        candidateAddressToId[msg.sender] = newCandidateId;
        candidateIds.push(newCandidateId);

        emit CandidateRegistered(newCandidateId, msg.sender, _name);
    }

    function validateCandidate(uint256 _candidateId, bool _approve) 
        external 
        onlyElectionAuthorityOrManager 
        inStatus(ElectionStatus.Registration) 
    {
        require(candidates[_candidateId].exists, "Candidate not found");
        require(candidates[_candidateId].status == CandidateStatus.Pending, "Already validated");

        if (_approve) {
            candidates[_candidateId].status = CandidateStatus.Approved;
            electionInfo.totalCandidates++;
        } else {
            candidates[_candidateId].status = CandidateStatus.Rejected;
        }

        emit CandidateValidated(_candidateId, candidates[_candidateId].status);
    }

    // ! ==================== VOTER MANAGEMENT ====================

    function registerVoter(address _voter) external onlyElectionAuthorityOrManager {
        require(_voter != address(0), "Invalid voter address");
        require(!voters[_voter].isRegistered, "Already registered");
        require(roles.hasRole(roles.VOTER(), _voter), "Address must have VOTER role first");
        
        voters[_voter] = VoterInfo({
            isRegistered: true,
            hasVoted: false,
            votedCandidateId: 0,
            registrationTime: block.timestamp
        });
        
        voterAddresses.push(_voter);

        emit VoterRegistered(_voter);
    }

    function registerVoterBatch(address[] memory _voters) external onlyElectionAuthorityOrManager {
        require(_voters.length > 0, "Empty voter list");
        require(_voters.length <= 100, "Batch size too large");
        
        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            
            if (voter == address(0) || voters[voter].isRegistered) {
                continue;
            }
            
            if (!roles.hasRole(roles.VOTER(), voter)) {
                continue;
            }
            
            voters[voter] = VoterInfo({
                isRegistered: true,
                hasVoted: false,
                votedCandidateId: 0,
                registrationTime: block.timestamp
            });
            
            voterAddresses.push(voter);
            
            emit VoterRegistered(voter);
        }
    }

    // ! ==================== VOTING ====================

    function castVote(uint256 _candidateId) external onlyVoter inStatus(ElectionStatus.Voting) nonReentrant {
        require(voters[msg.sender].isRegistered, "Not registered voter");
        require(!voters[msg.sender].hasVoted, "Already voted");
        require(candidates[_candidateId].exists, "Candidate not found");
        require(candidates[_candidateId].status == CandidateStatus.Approved, "Candidate not approved");
        require(block.timestamp >= electionInfo.startTime, "Voting not started");
        require(block.timestamp <= electionInfo.endTime, "Voting ended");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedCandidateId = _candidateId;
        
        candidates[_candidateId].voteCount++;
        electionInfo.totalVotes++;

        emit VoteCasted(msg.sender, _candidateId);
    }

    // ! ==================== RESULT CALCULATION ====================

    function getWinner() public view returns (uint256) {
        require(
            electionInfo.status == ElectionStatus.Ended || 
            electionInfo.status == ElectionStatus.ResultDeclared,
            "Election not ended"
        );
        
        uint256 maxVotes = 0;
        uint256 winnerId = 0;

        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateId = candidateIds[i];
            if (candidates[candidateId].status == CandidateStatus.Approved) {
                if (candidates[candidateId].voteCount > maxVotes) {
                    maxVotes = candidates[candidateId].voteCount;
                    winnerId = candidateId;
                }
            }
        }

        return winnerId;
    }

    function getResults() external view returns (
        uint256[] memory ids,
        string[] memory names,
        uint256[] memory voteCounts
    ) {
        require(
            electionInfo.status == ElectionStatus.Ended || 
            electionInfo.status == ElectionStatus.ResultDeclared,
            "Results not available yet"
        );

        uint256 approvedCount = 0;
        for (uint256 i = 0; i < candidateIds.length; i++) {
            if (candidates[candidateIds[i]].status == CandidateStatus.Approved) {
                approvedCount++;
            }
        }

        ids = new uint256[](approvedCount);
        names = new string[](approvedCount);
        voteCounts = new uint256[](approvedCount);

        uint256 index = 0;
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateId = candidateIds[i];
            if (candidates[candidateId].status == CandidateStatus.Approved) {
                ids[index] = candidateId;
                names[index] = candidates[candidateId].name;
                voteCounts[index] = candidates[candidateId].voteCount;
                index++;
            }
        }

        return (ids, names, voteCounts);
    }

    // ! ==================== VIEW FUNCTIONS ====================

    function getCandidateDetails(uint256 _candidateId) external view returns (Candidate memory) {
        require(candidates[_candidateId].exists, "Candidate not found");
        return candidates[_candidateId];
    }

    function getAllApprovedCandidates() external view returns (Candidate[] memory) {
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < candidateIds.length; i++) {
            if (candidates[candidateIds[i]].status == CandidateStatus.Approved) {
                approvedCount++;
            }
        }

        Candidate[] memory approvedCandidates = new Candidate[](approvedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateId = candidateIds[i];
            if (candidates[candidateId].status == CandidateStatus.Approved) {
                approvedCandidates[index] = candidates[candidateId];
                index++;
            }
        }

        return approvedCandidates;
    }

    function getPendingCandidates() external view returns (Candidate[] memory) {
        uint256 pendingCount = 0;
        for (uint256 i = 0; i < candidateIds.length; i++) {
            if (candidates[candidateIds[i]].status == CandidateStatus.Pending) {
                pendingCount++;
            }
        }

        Candidate[] memory pendingCandidates = new Candidate[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateId = candidateIds[i];
            if (candidates[candidateId].status == CandidateStatus.Pending) {
                pendingCandidates[index] = candidates[candidateId];
                index++;
            }
        }

        return pendingCandidates;
    }

    function getVoterInfo(address _voter) external view returns (VoterInfo memory) {
        return voters[_voter];
    }

    function getElectionInfo() external view returns (ElectionInfo memory) {
        return electionInfo;
    }

    function getTotalVoters() external view returns (uint256) {
        return voterAddresses.length;
    }

    function getTotalCandidates() external view returns (uint256) {
        return candidateIds.length;
    }

    function hasVoted(address _voter) external view returns (bool) {
        return voters[_voter].hasVoted;
    }

    function isVoterRegistered(address _voter) external view returns (bool) {
        return voters[_voter].isRegistered;
    }

    function getCandidateIdCounter() external view returns (uint256) {
        return candidateIdCounter;
    }
}