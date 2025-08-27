// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "./ElectionManager.sol";

contract ElectionFactory is AccessControl {
    // ROLES
    bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");

    // STATE VARIABLES
    uint256 public electionCount;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => address) public electionManagers;
    
    enum ElectionType { Presidential, Parliamentary, Local, Corporate, Referendum }
          
    // STRUCTURE OF ELECTION
    struct Election {
        uint256 id;
        string title;
        ElectionType electionType;
        string description;
        address electionAuthority;
        address managerContract;
    }

    // MODIFIERS
    modifier onlyAdmin() {
        require(hasRole(SUPER_ADMIN, msg.sender), "Not authorized");
        _;
    }

    // EVENTS
    event ElectionCreated(uint256 id, string title, ElectionType electionType, address electionAuthority, address managerContract);

    // CONSTRUCTOR
    constructor() {
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

    function createElection(
        string memory _title,
        string memory _description,
        ElectionType _electionType,
        address _electionAuthority
    ) public onlyAdmin returns(uint256) {
        
        // Deploy ElectionManager contract
        ElectionManager newManager = new ElectionManager(
            address(this),
            electionCount,
            _title,
            ElectionManager.ElectionType(uint8(_electionType)),
            _description,
            _electionAuthority
        );
        
        address managerAddress = address(newManager);
        
        // Store election data
        elections[electionCount] = Election({
            id: electionCount,
            title: _title,
            electionType: _electionType,
            description: _description,
            electionAuthority: _electionAuthority,
            managerContract: managerAddress
        });
        
        electionManagers[electionCount] = managerAddress;
        
        emit ElectionCreated(electionCount, _title, _electionType, _electionAuthority, managerAddress);
        
        uint256 currentId = electionCount;
        electionCount++;
        return currentId;
    }

    function getElection(uint256 _id) public view returns (Election memory) {
        require(_id < electionCount, "Election does not exist");
        return elections[_id];
    }

    function getElectionManager(uint256 _id) public view returns (address) {
        require(_id < electionCount, "Election does not exist");
        return electionManagers[_id];
    }
}