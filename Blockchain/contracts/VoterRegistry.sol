// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "./ElectionManager.sol";

contract VoterRegistry {
    ElectionManager public immutable electionManager;
    
    mapping(address => Voter) public voters;
    
    struct Voter {
        address walletAddress;
        string name;
        string aadharHash;
        bool isVerified;
        bool hasVoted;
    }

    modifier onlyElectionManager() {
        require(electionManager.hasRole(electionManager.ELECTION_MANAGER(), msg.sender), "Not election manager");
        _;
    }
    
    modifier onlyElectionAuthority() {
        require(electionManager.hasRole(electionManager.ELECTION_AUTHORITY(), msg.sender), "Not election authority");
        _;
    }
    
    modifier onlyManagerOrAuthority() {
        require(
            electionManager.hasRole(electionManager.ELECTION_MANAGER(), msg.sender) || 
            electionManager.hasRole(electionManager.ELECTION_AUTHORITY(), msg.sender), 
            "Not authorized"
        );
        _;
    }

    event VoterRegistered(address voter, string name, string aadharHash);
    event VoterVerified(address voter);
    event VoterVoted(address voter);

    constructor(address _electionManager) {
        require(_electionManager != address(0), "Invalid election manager address");
        electionManager = ElectionManager(_electionManager);
    }

    function isElectionManager(address account) public view returns(bool) {
        return electionManager.hasRole(electionManager.ELECTION_MANAGER(), account);
    }
    
    function isElectionAuthority(address account) public view returns(bool) {
        return electionManager.hasRole(electionManager.ELECTION_AUTHORITY(), account);
    }

    function registerVoter(string memory _name, string memory _aadharHash) public {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_aadharHash).length > 0, "Aadhar hash cannot be empty");
        require(voters[msg.sender].walletAddress == address(0), "Voter already registered");
        
        voters[msg.sender] = Voter({
            walletAddress: msg.sender,
            name: _name,
            aadharHash: _aadharHash,
            isVerified: false,
            hasVoted: false
        });

        emit VoterRegistered(msg.sender, _name, _aadharHash);
    }
    
    function verifyVoter(address _voter) public onlyElectionAuthority {
        require(_voter != address(0), "Invalid voter address");
        require(voters[_voter].walletAddress != address(0), "Voter is not registered yet");
        require(!voters[_voter].isVerified, "Voter already verified");
        
        voters[_voter].isVerified = true;
        emit VoterVerified(_voter);
    }

    function isEligible(address _voter) public view returns (bool) {
        require(_voter != address(0), "Invalid voter address");
        require(voters[_voter].walletAddress != address(0), "Voter is not registered");
        require(voters[_voter].isVerified, "Voter is not verified");
        require(!voters[_voter].hasVoted, "Voter already voted");
        return true;
    }

    function markVoted(address _voter) public onlyElectionAuthority {
        require(_voter != address(0), "Invalid voter address");
        require(voters[_voter].walletAddress != address(0), "Voter is not registered");
        require(voters[_voter].isVerified, "Voter is not verified");
        require(!voters[_voter].hasVoted, "Voter already voted");
        
        voters[_voter].hasVoted = true;
        emit VoterVoted(_voter);
    }

    function batchVerifyVoters(address[] calldata _voters) public onlyElectionManager {
        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            if (voters[voter].walletAddress != address(0) && !voters[voter].isVerified) {
                voters[voter].isVerified = true;
                emit VoterVerified(voter);
            }
        }
    }

    function getVoterDetails(address _voter) public view returns (
        string memory name,
        string memory aadharHash,
        bool isVerified,
        bool hasVoted
    ) {
        require(_voter != address(0), "Invalid voter address");
        Voter memory voter = voters[_voter];
        require(voter.walletAddress != address(0), "Voter not registered");
        
        return (voter.name, voter.aadharHash, voter.isVerified, voter.hasVoted);
    }

    function isRegistered(address _voter) public view returns (bool) {
        return voters[_voter].walletAddress != address(0);
    }

    function getElectionManager() public view returns (address) {
        return address(electionManager);
    }

    function getVoterStatus(address _voter) public view returns (
        bool isRegistered_,
        bool isVerified_,
        bool hasVoted_
    ) {
        if (voters[_voter].walletAddress == address(0)) {
            return (false, false, false);
        }
        
        return (
            true,
            voters[_voter].isVerified,
            voters[_voter].hasVoted
        );
    }

    function canVote(address _voter) public view returns (bool) {
        if (voters[_voter].walletAddress == address(0)) return false;
        if (!voters[_voter].isVerified) return false;
        if (voters[_voter].hasVoted) return false;
        return true;
    }

    function resetVoterVoteStatus(address _voter) public onlyElectionManager {
        require(voters[_voter].walletAddress != address(0), "Voter not registered");
        voters[_voter].hasVoted = false;
    }

    function revokeVoterVerification(address _voter) public onlyElectionManager {
        require(voters[_voter].walletAddress != address(0), "Voter not registered");
        require(voters[_voter].isVerified, "Voter not verified");
        voters[_voter].isVerified = false;
        voters[_voter].hasVoted = false;
    }
}