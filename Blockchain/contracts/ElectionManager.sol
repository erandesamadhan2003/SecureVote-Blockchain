// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";


contract ElectionManager is AccessControl{

    //ROLES
    bytes32 public constant ELECTION_MANAGER = keccak256("ELECTION_MANAGER");
    bytes32 public constant ELECTION_AUTHORITY=keccak256("ELECTION_AUTHORITY");

    
    // enums
    enum ElectionPhase{Created,Registration,Voting,Ended,ResultDeclared}
    enum ElectionType{Presidential,Parliamentary,Local, Corporate,Referendum}

    //state variables
    mapping(uint256=>Electioninfo) public electioninfo;

     // struct   
    struct Electioninfo{
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


    // MODIFIERS
    modifier onlyAdmin(){
        require(hasRole(ELECTION_MANAGER,msg.sender),"Not authorized");
        _;
    }

    modifier onlyAuthority(){
        require(hasRole(ELECTION_AUTHORITY,msg.sender),"Not authorized");
        _;
    }

    
    //EVENTS
    event PhaseChanged(uint256 electionid ,ElectionPhase newPhase);
    event AuthorityAdded(address account);
    event AuthorityRemoved(address account);


    // constructor
    constructor(
         uint256 _id,
         string memory _title,
         ElectionType _electionType,  
         string memory _description,
         address _ElectionManager
) {
    grantRole(ELECTION_MANAGER, _ElectionManager);
    electioninfo[_id] = Electioninfo({
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

    //functions
    function addElectionAuthority(address newAuthority) public onlyAdmin returns(bool){
        grantRole(ELECTION_AUTHORITY,newAuthority);
        emit AuthorityAdded(newAuthority);
        return true;
    }

    function removeElectionAuthority(address admin) public onlyAdmin returns(bool){
        revokeRole(ELECTION_AUTHORITY,admin);
        emit AuthorityRemoved(admin);
        return true;
    }

    function startRegistration(uint _id,uint256 start, uint256 end) public onlyAuthority {
        require(electioninfo[_id].id==_id,"election not found");
        require(start<end,"invalid time range");
        require(electioninfo[_id].currentPhase==ElectionPhase.Created,"Wrong phase");

        electioninfo[_id].registrationStart=start;
        electioninfo[_id].registrationEnd=end;
        electioninfo[_id].currentPhase=ElectionPhase.Registration;
        emit PhaseChanged(_id,ElectionPhase.Registration);
    }
   
    function startVoting(uint256 _id,uint256 start,uint256 end) public onlyAuthority {
        require(electioninfo[_id].id==_id,"election not found");
        require(start<end,"invalid time range");
        require(electioninfo[_id].currentPhase==ElectionPhase.Registration,"Wrong phase");

        electioninfo[_id].votingStart=start;
        electioninfo[_id].votingEnd=end;
        electioninfo[_id].currentPhase=ElectionPhase.Voting;
        emit PhaseChanged(_id,ElectionPhase.Voting);
    }

    function endElection(uint256 _id) public onlyAuthority {
        require(electioninfo[_id].id==_id,"election not found");
        require(electioninfo[_id].currentPhase==ElectionPhase.Voting,"Wrong phase");
        electioninfo[_id].currentPhase=ElectionPhase.Ended;
        emit PhaseChanged(_id,ElectionPhase.Ended);

    }

    function declareResults(uint256 _id) public onlyAuthority{
        require(electioninfo[_id].id==_id,"election not found");
        require(electioninfo[_id].currentPhase==ElectionPhase.Ended,"Wrong phase");
        electioninfo[_id].currentPhase=ElectionPhase.ResultDeclared;
        emit PhaseChanged(_id,ElectionPhase.ResultDeclared);
    } 

    function emergencyStop(uint256 _id) public onlyAdmin{
        require(electioninfo[_id].id==_id,"election not found");
        require(electioninfo[_id].currentPhase!=ElectionPhase.Ended,"already ended");
        electioninfo[_id].currentPhase=ElectionPhase.Ended;
        emit PhaseChanged(_id,ElectionPhase.Ended);

    }



}