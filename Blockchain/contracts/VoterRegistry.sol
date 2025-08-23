// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VoterRegistry {
    // enum
    enum VerificationStatus { Pending, UnderReview, Verified, Rejected }

    // structs
    struct Voter {
        address walletAddress;
        bytes32 aadharHash;
        string encryptedPersonalinfo;
        VerificationStatus kycStatus;
        bool isEligible;
        bool hasVoted;
        uint256 registrationTime;
        address verifiedBy;
    }

    // state variables
    mapping(address => Voter) public voters;
    mapping(bytes32 => address) private aadhaarToAddress;
    mapping(address => bool) private registeredVoters;
    address[] public voterList;
    uint256 public totalRegistered;
    uint256 public totalVerified;

    // Events
    event VoterRegistered(address indexed voter, uint256 timestamp);
    event VoterVerified(address indexed voter, address verifier);

    // --- Query Functions ---
    // check if voter registered or not
    function isRegistered(address _voter) public view returns (bool) {
        return registeredVoters[_voter];
    }

    // check if voter is eligible
    function isEligible(address _voter) public view returns (bool) {
        return voters[_voter].isEligible;
    }

    // check if voter has voted
    function hasVoted(address _voter) public view returns (bool) {
        return voters[_voter].hasVoted;
    }

    // get complete voter information
    function getVoterInfo(address _voter) external view returns (Voter memory) {
        return voters[_voter];
    }

    // --- Registration Function ---
    function registerVoter(
        bytes32 _aadhaarHash,
        string memory _encryptedPersonalInfo
    ) external {
        require(!isRegistered(msg.sender), "Already registered");
        require(
            aadhaarToAddress[_aadhaarHash] == address(0),
            "Aadhaar already used"
        );

        // create voter
        voters[msg.sender] = Voter({
            walletAddress: msg.sender,
            aadharHash: _aadhaarHash,
            encryptedPersonalinfo: _encryptedPersonalInfo,
            kycStatus: VerificationStatus.Pending,
            isEligible: false,
            hasVoted: false,
            registrationTime: block.timestamp,
            verifiedBy: address(0)
        });

        // mark as registered
        registeredVoters[msg.sender] = true;

        // store mapping for duplicate prevention
        aadhaarToAddress[_aadhaarHash] = msg.sender;

        voterList.push(msg.sender);
        totalRegistered++;

        emit VoterRegistered(msg.sender, block.timestamp);
    }

    // --- Verification Function ---
    modifier onlyVerifier() {
        // TODO: Add verifier logic (role-based access control)
        _;
    }

    function verifyVoter(address _voter) external onlyVerifier {
        require(isRegistered(_voter), "Voter not registered");
        require(
            voters[_voter].kycStatus == VerificationStatus.Pending,
            "Not pending"
        );

        voters[_voter].kycStatus = VerificationStatus.Verified;
        voters[_voter].isEligible = true;
        voters[_voter].verifiedBy = msg.sender;
        totalVerified++;

        emit VoterVerified(_voter, msg.sender);
    }

    // --- Reject Voter ---
    function rejectVoter(
        address _voter,
        string memory _reason
    ) external onlyVerifier {
        require(isRegistered(_voter), "Voter not registered");
        voters[_voter].kycStatus = VerificationStatus.Rejected;

        // TODO: Store/log rejected reason if needed
    }

    // --- Voting Status Management ---
    modifier onlyVotingEngine() {
        // TODO: Add logic for voting engine role
        _;
    }

    function markAsVoted(address _voter) external onlyVotingEngine {
        require(isEligible(_voter), "Not eligible");
        require(!voters[_voter].hasVoted, "Already voted");

        voters[_voter].hasVoted = true;
    }
}