// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract ElectionManager is AccessControl {
    bytes32 public constant ELECTION_MANAGER = keccak256("ELECTION_MANAGER");
    bytes32 public constant ELECTION_AUTHORITY = keccak256("ELECTION_AUTHORITY");

    address public immutable factory;

    enum ElectionPhase {
        Created,
        Registration,
        Voting,
        Ended,
        ResultDeclared
    }

    enum ElectionType {
        Presidential,
        Parliamentary,
        Local,
        Corporate,
        Referendum
    }

    mapping(uint256 => ElectionInfo) public electioninfo;

    struct ElectionInfo {
        uint256 id;
        string title;
        string description;
        ElectionType electionType;
        ElectionPhase currentPhase;
        uint256 registrationStart;
        uint256 registrationEnd;
        uint256 votingStart;
        uint256 votingEnd;
    }

    modifier onlyManager() {
        require(hasRole(ELECTION_MANAGER, msg.sender), "Not election manager");
        _;
    }

    modifier onlyAuthority() {
        require(hasRole(ELECTION_AUTHORITY, msg.sender), "Not election authority");
        _;
    }

    modifier onlySuperAdmin() {
        require(isFactorySuperAdmin(msg.sender), "Not super admin");
        _;
    }

    modifier onlyManagerOrSuperAdmin() {
        require(
            hasRole(ELECTION_MANAGER, msg.sender) || isFactorySuperAdmin(msg.sender),
            "Not authorized"
        );
        _;
    }

    event PhaseChanged(uint256 electionid, ElectionPhase newPhase);
    event AuthorityAdded(address account);
    event AuthorityRemoved(address account);

    constructor(
        address _factory,
        uint256 _id,
        string memory _title,
        ElectionType _electionType,
        string memory _description,
        address _electionAuthority
    ) {
        factory = _factory;
        grantRole(ELECTION_MANAGER, _electionAuthority);
        grantRole(ELECTION_AUTHORITY, _electionAuthority);

        electioninfo[_id] = ElectionInfo({
            id: _id,
            title: _title,
            description: _description,
            electionType: _electionType,
            currentPhase: ElectionPhase.Created,
            registrationStart: 0,
            registrationEnd: 0,
            votingStart: 0,
            votingEnd: 0
        });
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

    function addElectionAuthority(address newAuthority) public onlyManagerOrSuperAdmin returns (bool) {
        grantRole(ELECTION_AUTHORITY, newAuthority);
        emit AuthorityAdded(newAuthority);
        return true;
    }

    function removeElectionAuthority(address authority) public onlyManagerOrSuperAdmin returns (bool) {
        revokeRole(ELECTION_AUTHORITY, authority);
        emit AuthorityRemoved(authority);
        return true;
    }

    function startRegistration(uint256 _id, uint256 start, uint256 end) public onlyAuthority {
        require(electioninfo[_id].id == _id, "Election not found");
        require(start < end, "Invalid time range");
        require(block.timestamp < start, "Start time must be in future");
        require(electioninfo[_id].currentPhase == ElectionPhase.Created, "Wrong phase");

        electioninfo[_id].registrationStart = start;
        electioninfo[_id].registrationEnd = end;
        electioninfo[_id].currentPhase = ElectionPhase.Registration;
        emit PhaseChanged(_id, ElectionPhase.Registration);
    }

    function startVoting(uint256 _id, uint256 start, uint256 end) public onlyAuthority {
        require(electioninfo[_id].id == _id, "Election not found");
        require(start < end, "Invalid time range");
        require(start >= electioninfo[_id].registrationEnd, "Voting must start after registration");
        require(electioninfo[_id].currentPhase == ElectionPhase.Registration, "Wrong phase");

        electioninfo[_id].votingStart = start;
        electioninfo[_id].votingEnd = end;
        electioninfo[_id].currentPhase = ElectionPhase.Voting;
        emit PhaseChanged(_id, ElectionPhase.Voting);
    }

    function endElection(uint256 _id) public onlyAuthority {
        require(electioninfo[_id].id == _id, "Election not found");
        require(electioninfo[_id].currentPhase == ElectionPhase.Voting, "Wrong phase");
        require(block.timestamp >= electioninfo[_id].votingEnd, "Voting period not ended yet");
        
        electioninfo[_id].currentPhase = ElectionPhase.Ended;
        emit PhaseChanged(_id, ElectionPhase.Ended);
    }

    function declareResults(uint256 _id) public onlyAuthority {
        require(electioninfo[_id].id == _id, "Election not found");
        require(electioninfo[_id].currentPhase == ElectionPhase.Ended, "Wrong phase");
        electioninfo[_id].currentPhase = ElectionPhase.ResultDeclared;
        emit PhaseChanged(_id, ElectionPhase.ResultDeclared);
    }

    function emergencyStop(uint256 _id) public onlyManagerOrSuperAdmin {
        require(electioninfo[_id].id == _id, "Election not found");
        require(electioninfo[_id].currentPhase != ElectionPhase.Ended, "Already ended");
        electioninfo[_id].currentPhase = ElectionPhase.Ended;
        emit PhaseChanged(_id, ElectionPhase.Ended);
    }

    function getCurrentPhase(uint256 _id) public view returns (ElectionPhase) {
        require(electioninfo[_id].id == _id, "Election not found");
        return electioninfo[_id].currentPhase;
    }

    function getElectionTimes(uint256 _id) public view returns (
        uint256 registrationStart,
        uint256 registrationEnd,
        uint256 votingStart,
        uint256 votingEnd
    ) {
        require(electioninfo[_id].id == _id, "Election not found");
        ElectionInfo memory election = electioninfo[_id];
        return (
            election.registrationStart,
            election.registrationEnd,
            election.votingStart,
            election.votingEnd
        );
    }

    function getElectionInfo(uint256 _id) public view returns (ElectionInfo memory) {
        require(electioninfo[_id].id == _id, "Election not found");
        return electioninfo[_id];
    }
}