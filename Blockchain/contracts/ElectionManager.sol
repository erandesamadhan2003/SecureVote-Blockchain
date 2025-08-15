// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ElectionManager{

    // enums
    enum ElectionPhase{Created,Registration,Voting,Ended,ResultDeclared}
    enum ElectionType{Presidential,Parliamentary,Local, Corporate,Referendum}

    // struct   
    struct Electioninfo{
        uint256 id;
        string  title;
        string description;
        ElectionType electionType;
        address authority;
        ElectionPhase electionPhase;
        uint256 registrationStartTime;
        uint256 registrationEndTime;
        uint256 votingStartTime;
        uint256 votingEndTime;
    }

    //state variables
    Electioninfo public electionInfo;


    // constructors
    constructor(uint256 _id,string memory _title,string memory _description,ElectionType _electionType,address _authority) {

    // initialize the election info
       electionInfo= Electioninfo({
            id: _id,
            title: _title,
            description: _description,
            electionType: _electionType,
            authority: _authority,
            electionPhase: ElectionPhase.Created,
            registrationStartTime: 0,
            registrationEndTime: 0,
            votingStartTime: 0,
            votingEndTime: 0
       });
    }


    // function to start registration phase
    function startRegistration(uint256 _startTime, uint256 _endTime) public {
        require(electionInfo.electionPhase == ElectionPhase.Created, "Election is not in Created phase");
        require(_startTime < _endTime, "Start time must be before end time");
        require(_startTime > block.timestamp, "Start time must be in the future");
        electionInfo.registrationStartTime = _startTime;
        electionInfo.registrationEndTime = _endTime;
        electionInfo.electionPhase = ElectionPhase.Registration;
    } 

    // function to start voting phase
    function startVoting(uint256 _startTime , uint256 _endTime) public {
        require(electionInfo.electionPhase==ElectionPhase.Registration, "Election is not in Registration phase");
        require(_startTime < _endTime, "Start time must be before end time");
        require(_startTime > block.timestamp, "Start time must be in the future");
        electionInfo.votingStartTime = _startTime;
        electionInfo.votingEndTime = _endTime;
        electionInfo.electionPhase = ElectionPhase.Voting;
         
    }

    // function to end election
    function endVoting() public {
        require(electionInfo.electionPhase == ElectionPhase.Voting, "Election is not in Voting phase");
        require(block.timestamp>electionInfo.votingEndTime,"Voting period not ended");
        electionInfo.electionPhase = ElectionPhase.Ended;
        
    }

    // function to declare results
    function declareResults() public {
        require(electionInfo.electionPhase == ElectionPhase.Ended, "Election is not in Ended phase");
        electionInfo.electionPhase = ElectionPhase.ResultDeclared;
    }

}