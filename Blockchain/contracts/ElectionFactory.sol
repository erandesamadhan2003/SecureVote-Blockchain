// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import './ElectionManager.sol';

contract ElectionFactory {
    // STATE VARIABLES
    address public superAdmin;
    mapping(uint256 => address) public elections;
    uint256 public electionCounter;

    // EVENTS
    event ElectionCreated(uint256 indexed electionId, address electionAddress);

    // CONSTRUCTOR
    constructor() {
        superAdmin = msg.sender;
        electionCounter = 0;
    }

    // MODIFIERS
    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "Not authorized");
        _;
    }

    // FUNCTIONS
    // CREATE AN ELECTION
    function createElection(
        string memory title,
        string memory description,
        ElectionType electionType,
        address electionAuthority
    ) external onlySuperAdmin returns (uint256) {

        require(electionAuthority != address(0), "Invalid election authority");

        // DEPLOY THE ELECTIONMANAGER CONTRACT
        ElectionManager newElection = new ElectionManager(
            electionCounter,
            title,
            description,
            electionType,
            electionAuthority,
            address(this)
        );

        // STORE THE ELECTION REFERENCE 
        elections[electionCounter] = address(newElection);

        // EMIT ELECTION CREATED EVENT
        emit ElectionCreated(electionCounter, address(newElection));

        return electionCounter++;
    }

    // GET ALL DEPLOYED ELECTION
    function getAllElections() external view returns (address[] memory) {
        address[] memory allElections = new address[](electionCounter);
        for (uint256 i = 0; i < electionCounter; i++) {
            allElections[i] = elections[i];
        }
        return allElections;
    }

    // GET ELECTION BY AUTHORITY ADDRESS (SCAN ALL ELECTIONS) 
    function getElectionByAuthority(address authority) external view returns (address) {
        for(uint i = 0; i < electionCounter; i++) {
            address electionAddress = elections[i];
            if (ElectionManager(electionAddress).electionAuthority() == authority) {
                return electionAddress;
            }
        }
        return address(0);
    }
}