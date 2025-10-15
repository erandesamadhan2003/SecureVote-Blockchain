// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Election.sol";
import "./Roles.sol";

contract ElectionFactory {
    Roles public roles;
    uint256 private electionIdCounter;

    struct ElectionMetadata {
        uint256 id;
        address electionAddress;
        address creator;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 createdAt;
        bool isActive;
    }

    mapping(uint256 => ElectionMetadata) public elections;
    mapping(address => uint256[]) public managerElections;
    mapping(address => bool) public isElectionContract;
    uint256[] public allElectionIds;

    event ElectionCreated(
        uint256 indexed electionId,
        address indexed electionAddress,
        address indexed creator,
        string name,
        uint256 startTime,
        uint256 endTime
    );
    event ElectionDeactivated(uint256 indexed electionId, address deactivatedBy);

    modifier onlyElectionManager() {
        require(
            roles.hasRole(roles.ELECTION_MANAGER(), msg.sender),
            "Only election manager"
        );
        _;
    }

    modifier onlySuperAdmin() {
        require(
            roles.hasRole(roles.SUPER_ADMIN(), msg.sender),
            "Only super admin"
        );
        _;
    }

    constructor(address _rolesAddress) {
        require(_rolesAddress != address(0), "Invalid roles address");
        roles = Roles(_rolesAddress);
        electionIdCounter = 0;
    }

    function createElection(
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _registrationDeadline
    ) external onlyElectionManager returns (address electionAddress) {
        require(bytes(_name).length > 0, "Name required");
        require(_startTime > block.timestamp, "Start time must be in future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_registrationDeadline < _startTime, "Registration must end before voting");

        electionIdCounter++;
        uint256 newElectionId = electionIdCounter;

        Election newElection = new Election(
            address(roles),
            msg.sender,
            _name,
            _description,
            _startTime,
            _endTime,
            _registrationDeadline
        );

        electionAddress = address(newElection);

        elections[newElectionId] = ElectionMetadata({
            id: newElectionId,
            electionAddress: electionAddress,
            creator: msg.sender,
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            createdAt: block.timestamp,
            isActive: true
        });

        managerElections[msg.sender].push(newElectionId);
        allElectionIds.push(newElectionId);
        isElectionContract[electionAddress] = true;

        emit ElectionCreated(
            newElectionId,
            electionAddress,
            msg.sender,
            _name,
            _startTime,
            _endTime
        );

        return electionAddress;
    }

    function deactivateElection(uint256 _electionId) external {
        require(elections[_electionId].electionAddress != address(0), "Election not found");
        require(elections[_electionId].isActive, "Election already inactive");
        require(
            elections[_electionId].creator == msg.sender || 
            roles.hasRole(roles.SUPER_ADMIN(), msg.sender),
            "Not authorized"
        );

        elections[_electionId].isActive = false;
        emit ElectionDeactivated(_electionId, msg.sender);
    }

    function reactivateElection(uint256 _electionId) external onlySuperAdmin {
        require(elections[_electionId].electionAddress != address(0), "Election not found");
        require(!elections[_electionId].isActive, "Election already active");

        elections[_electionId].isActive = true;
    }

    function getElection(uint256 _electionId) external view returns (ElectionMetadata memory) {
        require(elections[_electionId].electionAddress != address(0), "Election not found");
        return elections[_electionId];
    }

    function getManagerElections(address _manager) external view returns (uint256[] memory) {
        return managerElections[_manager];
    }

    function getAllElections() external view returns (ElectionMetadata[] memory) {
        ElectionMetadata[] memory allElections = new ElectionMetadata[](allElectionIds.length);
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            allElections[i] = elections[allElectionIds[i]];
        }
        
        return allElections;
    }

    function getActiveElections() external view returns (ElectionMetadata[] memory) {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            if (elections[allElectionIds[i]].isActive) {
                activeCount++;
            }
        }

        ElectionMetadata[] memory activeElections = new ElectionMetadata[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            if (elections[allElectionIds[i]].isActive) {
                activeElections[index] = elections[allElectionIds[i]];
                index++;
            }
        }
        
        return activeElections;
    }

    function getOngoingElections() external view returns (ElectionMetadata[] memory) {
        uint256 ongoingCount = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            ElectionMetadata memory election = elections[allElectionIds[i]];
            if (election.isActive && 
                block.timestamp >= election.startTime && 
                block.timestamp <= election.endTime) {
                ongoingCount++;
            }
        }

        ElectionMetadata[] memory ongoingElections = new ElectionMetadata[](ongoingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            ElectionMetadata memory election = elections[allElectionIds[i]];
            if (election.isActive && 
                block.timestamp >= election.startTime && 
                block.timestamp <= election.endTime) {
                ongoingElections[index] = election;
                index++;
            }
        }
        
        return ongoingElections;
    }

    function getUpcomingElections() external view returns (ElectionMetadata[] memory) {
        uint256 upcomingCount = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            ElectionMetadata memory election = elections[allElectionIds[i]];
            if (election.isActive && block.timestamp < election.startTime) {
                upcomingCount++;
            }
        }

        ElectionMetadata[] memory upcomingElections = new ElectionMetadata[](upcomingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            ElectionMetadata memory election = elections[allElectionIds[i]];
            if (election.isActive && block.timestamp < election.startTime) {
                upcomingElections[index] = election;
                index++;
            }
        }
        
        return upcomingElections;
    }

    function getCompletedElections() external view returns (ElectionMetadata[] memory) {
        uint256 completedCount = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            ElectionMetadata memory election = elections[allElectionIds[i]];
            if (block.timestamp > election.endTime) {
                completedCount++;
            }
        }

        ElectionMetadata[] memory completedElections = new ElectionMetadata[](completedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            ElectionMetadata memory election = elections[allElectionIds[i]];
            if (block.timestamp > election.endTime) {
                completedElections[index] = election;
                index++;
            }
        }
        
        return completedElections;
    }

    function getTotalElections() external view returns (uint256) {
        return allElectionIds.length;
    }

    function getTotalActiveElections() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            if (elections[allElectionIds[i]].isActive) {
                count++;
            }
        }
        return count;
    }

    function isValidElection(address _address) external view returns (bool) {
        return isElectionContract[_address];
    }

    function getElectionIdByAddress(address _electionAddress) external view returns (uint256) {
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            if (elections[allElectionIds[i]].electionAddress == _electionAddress) {
                return allElectionIds[i];
            }
        }
        revert("Election not found");
    }

    function getElectionsByIds(uint256[] memory _electionIds) 
        external 
        view 
        returns (ElectionMetadata[] memory) 
    {
        ElectionMetadata[] memory result = new ElectionMetadata[](_electionIds.length);
        
        for (uint256 i = 0; i < _electionIds.length; i++) {
            require(elections[_electionIds[i]].electionAddress != address(0), "Election not found");
            result[i] = elections[_electionIds[i]];
        }
        
        return result;
    }

    function getElectionsByTimeRange(uint256 _startTime, uint256 _endTime) 
        external 
        view 
        returns (ElectionMetadata[] memory) 
    {
        require(_endTime >= _startTime, "Invalid time range");
        
        uint256 count = 0;
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            ElectionMetadata memory election = elections[allElectionIds[i]];
            if (election.createdAt >= _startTime && election.createdAt <= _endTime) {
                count++;
            }
        }

        ElectionMetadata[] memory result = new ElectionMetadata[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allElectionIds.length; i++) {
            ElectionMetadata memory election = elections[allElectionIds[i]];
            if (election.createdAt >= _startTime && election.createdAt <= _endTime) {
                result[index] = election;
                index++;
            }
        }
        
        return result;
    }

    function getElectionIdCounter() external view returns (uint256) {
        return electionIdCounter;
    }
}