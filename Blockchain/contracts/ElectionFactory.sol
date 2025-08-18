// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract ElectionFactory is AccessControl {
    //  ROLES
    bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");
    bytes32 public constant ELECTION_AUTHORITY = keccak256("ELECTION_AUTHORITY");

    // STATE VARIABLES
    uint256 public electionCount;
    mapping(uint265 => Election) public elections;

    
    // STRUCTURE OF ELECTION
    struct Election {
        uint256 id;
        string title;
        ElectionType electionType;
        string description;
        address electionAuhority;
    }

    // MODIFIERS
    modifier onlyAdmin() {
        require(hasRole(SUPER_ADMIN, msg.sender), "Not authorized");
        _;
    }

    // EVENTS
    event ElectionCreated(uint256 id, string title, string description, ElectionType electionType, address electionManager);

    //  CONSTRUCTOR 
    constructor () {
        grantRole(SUPER_ADMIN, msg.sender);
        electionCount = 0;
    }

    // FUNCTIONS
    function addSuperAdmin(address newAdmin) public onlyAdmin returns(bool) {
        grantRole(SUPER_ADMIN, newAdmin);
        return true;
    }

    function removeSuperAdmin(address admin) public onlyAdmin returns(bool) {
        revokeRole(SUPER_ADMIN, admin);
        return true;
    }

    function addElectionAuthority(address authority) public onlyAdmin returns(bool) {
        grantRole(ELECTION_AUTHORITY, authority);
        return true;
    }

    function removeElectionAuthority(address authority) public onlyAdmin returns(bool) {
        revokeRole(ELECTION_AUTHORITY, authority);
        return true;
    }

    function createElection(
        string memory _title,
        string memory _description,
        ElectionType _electionType,
        address _electionAuthority
    ) public onlyAdmin returns(uint256) {
        
        //! DEPLOY ELECTIONMANAGER CONTRACT


        // STORE THE ELECTION REFERENCE
        elections[electionCount] = Election(electionCount, _title, _electionType, _description, _electionAuthority);
        emit ElectionCreated(electionCount, _title, _description, _electionType, _electionAuthority);
        grantRole(role, _electionAuthority);

        return electionCount++;
    }

    function getElection(uint256 _id) public view onlyAdmin returns (Election memory) {
        require(_id < electionCount, "Election does not exist");
        return elections[_id];
    }
}