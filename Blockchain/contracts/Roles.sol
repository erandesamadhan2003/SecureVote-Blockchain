// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Roles is AccessControl {
    bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");
    bytes32 public constant ELECTION_MANAGER = keccak256("ELECTION_MANAGER");
    bytes32 public constant ELECTION_AUTHORITY =
        keccak256("ELECTION_AUTHORITY");
    bytes32 public constant VOTER = keccak256("VOTER");

    // ! Events
    event SuperAdminAdded(address indexed account);
    event ElectionManagerAdded(address indexed account);
    event ElectionAuthorityAdded(address indexed account);
    event VoterAdded(address indexed account);
    event RoleRemoved(bytes32 indexed role, address indexed account);

    constructor(address superAdmin) {
        require(superAdmin != address(0), "Invalid super admin address");
        _grantRole(SUPER_ADMIN, superAdmin);
        _grantRole(DEFAULT_ADMIN_ROLE, superAdmin);
        emit SuperAdminAdded(superAdmin);
    }

    // ! ==================== MODIFIERS ====================

    modifier onlySuperAdmin() {
        require(hasRole(SUPER_ADMIN, msg.sender), "Restricted to SUPER_ADMIN");
        _;
    }

    modifier onlyElectionManager() {
        require(
            hasRole(ELECTION_MANAGER, msg.sender),
            "Restricted to ELECTION_MANAGER"
        );
        _;
    }

    modifier onlyElectionAuthorityOrElectionManager() {
        require(
            hasRole(ELECTION_AUTHORITY, msg.sender) ||
                hasRole(ELECTION_MANAGER, msg.sender),
            "Restricted to ELECTION_AUTHORITY or ELECTION_MANAGER"
        );
        _;
    }

    modifier onlySuperAdminOrElectionManager() {
        require(
            hasRole(SUPER_ADMIN, msg.sender) ||
                hasRole(ELECTION_MANAGER, msg.sender),
            "Restricted to SUPER_ADMIN or ELECTION_MANAGER"
        );
        _;
    }

    modifier onlyVoter() {
        require(hasRole(VOTER, msg.sender), "Restricted to VOTER");
        _;
    }

    // ! ==================== ADD ROLE FUNCTIONS ====================

    function addSuperAdmin(address account) external onlySuperAdmin {
        require(account != address(0), "Invalid address");
        _grantRole(SUPER_ADMIN, account);
        emit SuperAdminAdded(account);
    }

    function addElectionManager(address account) external onlySuperAdmin {
        require(account != address(0), "Invalid address");
        _grantRole(ELECTION_MANAGER, account);
        emit ElectionManagerAdded(account);
    }

    function addElectionAuthority(
        address account
    ) external onlyElectionManager {
        require(account != address(0), "Invalid address");
        _grantRole(ELECTION_AUTHORITY, account);
        emit ElectionAuthorityAdded(account);
    }

    function addVoter(
        address account
    ) external onlyElectionAuthorityOrElectionManager {
        require(account != address(0), "Invalid address");
        _grantRole(VOTER, account);
        emit VoterAdded(account);
    }

    // ! ==================== REMOVE ROLE FUNCTIONS ====================

    function removeSuperAdmin(address account) external onlySuperAdmin {
        require(account != msg.sender, "Cannot remove yourself");
        _revokeRole(SUPER_ADMIN, account);
        emit RoleRemoved(SUPER_ADMIN, account);
    }

    function removeElectionManager(address account) external onlySuperAdmin {
        _revokeRole(ELECTION_MANAGER, account);
        emit RoleRemoved(ELECTION_MANAGER, account);
    }

    function removeVoter(
        address account
    ) external onlyElectionAuthorityOrElectionManager {
        _revokeRole(VOTER, account);
        emit RoleRemoved(VOTER, account);
    }

    function removeElectionAuthority(
        address account
    ) external onlySuperAdminOrElectionManager {
        _revokeRole(ELECTION_AUTHORITY, account);
        emit RoleRemoved(ELECTION_AUTHORITY, account);
    }

    // ! ==================== VIEW FUNCTIONS ====================

    function isSuperAdmin(address account) external view returns (bool) {
        return hasRole(SUPER_ADMIN, account);
    }

    function isElectionManager(address account) external view returns (bool) {
        return hasRole(ELECTION_MANAGER, account);
    }

    function isElectionAuthority(address account) external view returns (bool) {
        return hasRole(ELECTION_AUTHORITY, account);
    }

    function isVoter(address account) external view returns (bool) {
        return hasRole(VOTER, account);
    }
}
