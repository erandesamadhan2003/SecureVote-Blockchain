// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CandidateManager {
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
    mapping(uint256 => Candidate) public candidates;                // CANDIDATES INFORMATION
    mapping(address => uint256) public addressToCandidateIds;       // MAPPING CANDIDATE BY ADDRESS
    uint256 public candidateCounter;                                // TOTAL CANDIDATES CREATED
    uint256 public totalApproved;                                   // TOTAL APPROVED CANDIDATES

    // CONSTRUCTOR
    constructor() {
        owner = msg.sender;
    }

    // EVENTS
    event CandidateApplied(uint256 indexed candidateId, address indexed candidateAddress); // CANDIDATE APPLIED
    event CandidateApproved(uint256 indexed candidateId, address indexed approver);        // CANDIDATE APPROVED

    // MODIFIERS
    modifier onlyAuthority() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    address public owner = msg.sender;

    // FUNCTIONS
    // REGISTRATION FUNCTIONS
    function applyAsCandidate(
        string memory _name,
        string memory _party,
        string memory _manifesto,
        string memory _profileImage,
        bytes32 _documentHash
    ) external {
        require(bytes(_name).length > 0, "Name Required");
        require(addressToCandidateIds[msg.sender] == 0, "Already Applied");

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

        addressToCandidateIds[msg.sender] = candidateCounter;
        emit CandidateApplied(candidateCounter, msg.sender);   
    }

    // APPROVAL FUNCTIONS
    function approveCandidate(uint256 _candidateId) external onlyAuthority {
        require(_candidateId > 0 && _candidateId <= candidateCounter, "Invalid Candidate ID");
        require(candidates[_candidateId].status == CandidateStatus.Applied, "Not Applicable");

        candidates[_candidateId].status = CandidateStatus.Approved;
        candidates[_candidateId].approvedBy = msg.sender;
        totalApproved++;
        emit CandidateApproved(_candidateId, msg.sender);
    }

    // REJECTION FUNCTIONS 
    function rejectCandidate(uint256 _candidateId) external onlyAuthority {
        require(_candidateId > 0 && _candidateId <= candidateCounter , "Invalid candidate");
        candidates[ _candidateId ].status = CandidateStatus.Rejected;

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
}