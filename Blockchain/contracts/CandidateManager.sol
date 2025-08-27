// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "./ElectionManager.sol";

contract CandidateManager {
    ElectionManager public immutable electionManager;

    // ENUM 
    enum CandidateStatus { Applied, UnderReview, Approved, Rejected }

    // CANDIDATE INFORMATION
    struct Candidate {
        uint256 id;
        address walletAddress;
        string name;
        string party;
        string manifesto; //IPFS HASH
        string profileImage; // IPFS HASH
        bytes32 documentHash;
        CandidateStatus status;
        uint256 registrationTime;
        address approvedBy;
        uint256 voteCount;
    }

    // STATE VARIABLES  
    uint256 public candidateCounter; // TOTAL CANDIDATES CREATED
    mapping(uint256 => Candidate) public candidates;// CANDIDATES INFORMATION
    mapping(address=>bool) public hasRegistered;
    // mapping(address => uint256) public addressToCandidateIds;       // MAPPING CANDIDATE BY ADDRESS
  
    uint256 public totalApproved;                                   // TOTAL APPROVED CANDIDATES

    // EVENTS
    event CandidateRegistered(uint256 candidateId, address candidateAddress,string name,string party); // CANDIDATE APPLIED
    event CandidateVerified(uint256  candidateId);        // CANDIDATE APPROVED
    event CandidateRemoved(uint256 candidateId);       // candidate removed


    // MODIFIERS
    modifier onlyElectionManager(){
        require(electionManager.hasRole(electionManager.ELECTION_MANAGER(), msg.sender),"Not election manager");
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

    
    // CONSTRUCTOR
    constructor( address _electionManager) {
        require(_electionManager!= address(0),"Invalid election manager address");
        electionManager=ElectionManager(_electionManager);
    }


    // address public owner = msg.sender;

    // FUNCTIONS
    // REGISTRATION FUNCTIONS
    function registerCandidate(
        string memory _name,
        string memory _party,
        string memory _manifesto,
        string memory _profileImage,
        bytes32 _documentHash
    ) external {
        require(bytes(_name).length > 0, "Name Required");
        require(!hasRegistered[msg.sender], "Already Applied");
        candidateCounter++;
        candidates[candidateCounter] = Candidate({
            id: candidateCounter,
            walletAddress: msg.sender,
            name: _name,
            party: _party,
            manifesto: _manifesto,
            profileImage: _profileImage,
            documentHash: _documentHash,
            status: CandidateStatus.Applied,
            registrationTime: block.timestamp,
            approvedBy: address(0),
            voteCount: 0
        });

        hasRegistered[msg.sender] = true;
        emit CandidateRegistered(candidateCounter, msg.sender, _name, _party);   
    }

    // APPROVAL FUNCTIONS
    function verifyCandidate(uint256 _candidateId) external onlyElectionAuthority {
        require(_candidateId > 0 && _candidateId <= candidateCounter, "Invalid Candidate ID");
        require(candidates[_candidateId].status == CandidateStatus.Applied, "Not Applicable");

        candidates[_candidateId].status = CandidateStatus.Approved;
        candidates[_candidateId].approvedBy = msg.sender;
        totalApproved++;
        emit CandidateVerified(_candidateId);
    }

    // REJECTION FUNCTIONS 
    function removeCandidate(uint256 _candidateId) external onlyElectionAuthority {
        require(_candidateId > 0 && _candidateId <= candidateCounter , "Invalid candidate");
        require(hasRegistered[candidates[_candidateId].walletAddress], "Candidate is not registered");
        candidates[ _candidateId ].status = CandidateStatus.Rejected;
        emit CandidateRemoved(_candidateId);

        //! LOG IN AUDIT TRAIL
    }

    // QUERY FUNCTIONS
    function getApprovedCandidates() external view returns (uint256[] memory) {
        uint256[] memory approvedCandidates = new uint256[](totalApproved);
        uint256 index = 0;

        for (uint256 i = 1; i <= candidateCounter; i++) {
            if (candidates[i].status == CandidateStatus.Approved) {
                approvedCandidates[index] = i;
                index++;
            }
        }

        return approvedCandidates;
    }

    function getCandidateInfo (uint256 _candidateId) external view returns (Candidate memory ) {
        require(_candidateId > 0 && _candidateId <= candidateCounter, "Invalid candidate ID");
        return candidates[_candidateId];
    }

    function isCandidateApproved (uint256 _candidateId) public view returns (bool) {
        require(_candidateId > 0 && _candidateId <= candidateCounter, "Invalid candidate ID");
        return candidates[_candidateId].status == CandidateStatus.Approved;
    } 

    //function to increment a vote of a candidate
    function incrementVote(uint256 _candidateId) external {
         require(isCandidateApproved(_candidateId), "Candidate not approved");
         candidates[_candidateId].voteCount += 1;
    }  
}