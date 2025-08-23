// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
  
contract VoterRegistry {
   
    //manager contract reference
    address public immutable manager;
    
  
    // state variables
    mapping(address => Voter) public voters;
    
    // structs
    struct Voter {
        address walletAddress;
        string name;
        string aadharHash;
        bool isVerified;
        bool hasVoted;
    }

    //MODIFIERS
    modifier onlyManager(){
        require(isManagerElectionManager(msg.sender),"Not election manager");
        _;
    }
    

    // Events
    event VoterRegistered(address  voter, string name,string aadharHash);
    event VoterVerified(address  voter);
    event VoterVoted(address voter);
    

    //constructor
    constructor(address _manager) {
          manager = _manager;
        }


    //check manager electionManager role
    function isManagerElectionManager(address account) public view returns(bool){
        (bool success, bytes memory result)=manager.staticcall(
           abi.encodeWithSignature(
            "hasRole(bytes32,address)",
             keccak256("ELECTION_MANAGER"),
             account
           )
        );
        return success && abi.decode(result,(bool));

    }


    //function for  voter Registration
    function registerVoter(string memory _name,string memory _aadharHash) public {
        require(voters[msg.sender].walletAddress==address(0),"voter already registered");
        voters[msg.sender]=Voter({
            walletAddress:msg.sender,
            name:_name,
            aadharHash:_aadharHash,
            isVerified:false,
            hasVoted:false
        });

        emit VoterRegistered(msg.sender,_name,_aadharHash);

    }
    
    // function for verifyvoter
    function verifyVoter(address _voter) public onlyManager{
        require(voters[_voter].walletAddress!=address(0),"voter is not registered yet");
        voters[_voter].isVerified=true;
        emit VoterVerified(_voter);
    }


    // check if voter is eligible
    function isEligible(address _voter) public view returns (bool) {
        require(voters[_voter].isVerified==true,"voter is not verified");
        require(voters[_voter].hasVoted==false,"voter already give thier vote");
        return true;
    }


    // function for mark vote
    function markVoted(address _voter)  public onlyManager{
        require(voters[_voter].isVerified==true,"voter is not verified");
        require(voters[_voter].hasVoted==false,"voter alredy give thier vote");
        voters[_voter].hasVoted=true;
        emit VoterVoted(_voter);
    } 



    

}