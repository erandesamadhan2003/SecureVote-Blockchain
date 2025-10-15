const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Election Contract", function () {
    let roles, election;
    let superAdmin, electionManager, electionAuthority, candidate1, candidate2, voter1, voter2, voter3;
    let registrationDeadline, startTime, endTime;

    const DAY = 24 * 60 * 60;

    beforeEach(async function () {
        [superAdmin, electionManager, electionAuthority, candidate1, candidate2, voter1, voter2, voter3] = 
            await ethers.getSigners();

        // Deploy Roles contract
        const Roles = await ethers.getContractFactory("Roles");
        roles = await Roles.deploy(superAdmin.address);
        await roles.waitForDeployment();

        // Setup roles
        await roles.connect(superAdmin).addElectionManager(electionManager.address);
        await roles.connect(electionManager).addElectionAuthority(electionAuthority.address);
        await roles.connect(electionAuthority).addVoter(voter1.address);
        await roles.connect(electionAuthority).addVoter(voter2.address);
        await roles.connect(electionAuthority).addVoter(voter3.address);

        // Setup times
        const now = await time.latest();
        registrationDeadline = now + (7 * DAY);
        startTime = now + (10 * DAY);
        endTime = now + (17 * DAY);

        // Deploy Election contract
        const Election = await ethers.getContractFactory("Election");
        election = await Election.deploy(
            await roles.getAddress(),
            electionManager.address,
            "Test Election",
            "Test Description",
            startTime,
            endTime,
            registrationDeadline
        );
        await election.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set correct election info", async function () {
            const info = await election.getElectionInfo();
            expect(info.name).to.equal("Test Election");
            expect(info.description).to.equal("Test Description");
            expect(info.startTime).to.equal(startTime);
            expect(info.endTime).to.equal(endTime);
            expect(info.registrationDeadline).to.equal(registrationDeadline);
            expect(info.status).to.equal(0); // Created status
        });

        it("Should set correct election manager", async function () {
            expect(await election.electionManager()).to.equal(electionManager.address);
        });

        it("Should revert with invalid roles contract", async function () {
            const Election = await ethers.getContractFactory("Election");
            await expect(
                Election.deploy(
                    ethers.ZeroAddress,
                    electionManager.address,
                    "Test",
                    "Desc",
                    startTime,
                    endTime,
                    registrationDeadline
                )
            ).to.be.revertedWith("Invalid roles contract");
        });

        it("Should revert with invalid start time", async function () {
            const Election = await ethers.getContractFactory("Election");
            const pastTime = (await time.latest()) - DAY;
            
            await expect(
                Election.deploy(
                    await roles.getAddress(),
                    electionManager.address,
                    "Test",
                    "Desc",
                    pastTime,
                    endTime,
                    registrationDeadline
                )
            ).to.be.revertedWith("Start time must be in future");
        });

        it("Should revert with invalid end time", async function () {
            const Election = await ethers.getContractFactory("Election");
            
            await expect(
                Election.deploy(
                    await roles.getAddress(),
                    electionManager.address,
                    "Test",
                    "Desc",
                    startTime,
                    startTime - DAY, // End before start
                    registrationDeadline
                )
            ).to.be.revertedWith("End time must be after start time");
        });

        it("Should revert with invalid registration deadline", async function () {
            const Election = await ethers.getContractFactory("Election");
            
            await expect(
                Election.deploy(
                    await roles.getAddress(),
                    electionManager.address,
                    "Test",
                    "Desc",
                    startTime,
                    endTime,
                    startTime + DAY // Registration after start
                )
            ).to.be.revertedWith("Registration must end before voting starts");
        });
    });

    describe("Election Status Management", function () {
        it("Should start candidate registration", async function () {
            await expect(election.connect(electionManager).startCandidateRegistration())
                .to.emit(election, "ElectionStatusChanged")
                .withArgs(0, 1); // Created to Registration
            
            const info = await election.getElectionInfo();
            expect(info.status).to.equal(1); // Registration
        });

        it("Should not allow non-manager to start registration", async function () {
            await expect(election.connect(voter1).startCandidateRegistration())
                .to.be.revertedWith("Only election manager");
        });

        it("Should not start registration if deadline passed", async function () {
            await time.increaseTo(registrationDeadline + 1);
            
            await expect(election.connect(electionManager).startCandidateRegistration())
                .to.be.revertedWith("Registration deadline passed");
        });

        it("Should start voting after registration", async function () {
            await election.connect(electionManager).startCandidateRegistration();
            
            // Register and approve a candidate
            await election.connect(candidate1).registerCandidate(
                "Candidate 1",
                "Party A",
                "Manifesto 1",
                "ipfs://hash1"
            );
            await election.connect(electionManager).validateCandidate(1, true);
            
            await time.increaseTo(startTime);
            
            await expect(election.connect(electionManager).startVoting())
                .to.emit(election, "ElectionStatusChanged")
                .withArgs(1, 2); // Registration to Voting
        });

        it("Should not start voting without approved candidates", async function () {
            await election.connect(electionManager).startCandidateRegistration();
            await time.increaseTo(startTime);
            
            await expect(election.connect(electionManager).startVoting())
                .to.be.revertedWith("No approved candidates");
        });

        it("Should end election", async function () {
            // Setup and start voting
            await election.connect(electionManager).startCandidateRegistration();
            await election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await election.connect(electionManager).validateCandidate(1, true);
            await time.increaseTo(startTime);
            await election.connect(electionManager).startVoting();
            
            await time.increaseTo(endTime);
            
            await expect(election.connect(electionManager).endElection())
                .to.emit(election, "ElectionStatusChanged")
                .withArgs(2, 3); // Voting to Ended
        });

        it("Should declare result", async function () {
            // Setup and complete election
            await election.connect(electionManager).startCandidateRegistration();
            await election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await election.connect(electionManager).validateCandidate(1, true);
            await time.increaseTo(startTime);
            await election.connect(electionManager).startVoting();
            await time.increaseTo(endTime);
            await election.connect(electionManager).endElection();
            
            await expect(election.connect(electionManager).declareResult())
                .to.emit(election, "ResultDeclared");
            
            const info = await election.getElectionInfo();
            expect(info.status).to.equal(4); // ResultDeclared
        });
    });

    describe("Candidate Registration", function () {
        beforeEach(async function () {
            await election.connect(electionManager).startCandidateRegistration();
        });

        it("Should allow candidate registration", async function () {
            await expect(
                election.connect(candidate1).registerCandidate(
                    "Candidate 1",
                    "Party A",
                    "Manifesto 1",
                    "ipfs://hash1"
                )
            ).to.emit(election, "CandidateRegistered")
                .withArgs(1, candidate1.address, "Candidate 1");
            
            const candidate = await election.getCandidateDetails(1);
            expect(candidate.name).to.equal("Candidate 1");
            expect(candidate.party).to.equal("Party A");
            expect(candidate.status).to.equal(0); // Pending
        });

        it("Should not allow duplicate candidate registration", async function () {
            await election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            
            await expect(
                election.connect(candidate1).registerCandidate("C2", "P2", "M2", "H2")
            ).to.be.revertedWith("Already registered");
        });

        it("Should not allow registration without name", async function () {
            await expect(
                election.connect(candidate1).registerCandidate("", "Party A", "M1", "H1")
            ).to.be.revertedWith("Name required");
        });

        it("Should not allow registration without party", async function () {
            await expect(
                election.connect(candidate1).registerCandidate("Name", "", "M1", "H1")
            ).to.be.revertedWith("Party required");
        });

        it("Should not allow registration after deadline", async function () {
            await time.increaseTo(registrationDeadline + 1);
            
            await expect(
                election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1")
            ).to.be.revertedWith("Registration closed");
        });

        it("Should increment candidate counter correctly", async function () {
            await election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await election.connect(candidate2).registerCandidate("C2", "P2", "M2", "H2");
            
            expect(await election.getCandidateIdCounter()).to.equal(2);
        });
    });

    describe("Candidate Validation", function () {
        beforeEach(async function () {
            await election.connect(electionManager).startCandidateRegistration();
            await election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
        });

        it("Should allow election manager to approve candidate", async function () {
            await expect(election.connect(electionManager).validateCandidate(1, true))
                .to.emit(election, "CandidateValidated")
                .withArgs(1, 1); // Approved status
            
            const candidate = await election.getCandidateDetails(1);
            expect(candidate.status).to.equal(1); // Approved
            
            const info = await election.getElectionInfo();
            expect(info.totalCandidates).to.equal(1);
        });

        it("Should allow election authority to approve candidate", async function () {
            await expect(election.connect(electionAuthority).validateCandidate(1, true))
                .to.emit(election, "CandidateValidated");
        });

        it("Should allow rejection of candidate", async function () {
            await election.connect(electionManager).validateCandidate(1, false);
            
            const candidate = await election.getCandidateDetails(1);
            expect(candidate.status).to.equal(2); // Rejected
            
            const info = await election.getElectionInfo();
            expect(info.totalCandidates).to.equal(0);
        });

        it("Should not allow validation of non-existent candidate", async function () {
            await expect(
                election.connect(electionManager).validateCandidate(999, true)
            ).to.be.revertedWith("Candidate not found");
        });

        it("Should not allow re-validation", async function () {
            await election.connect(electionManager).validateCandidate(1, true);
            
            await expect(
                election.connect(electionManager).validateCandidate(1, false)
            ).to.be.revertedWith("Already validated");
        });

        it("Should not allow non-authority/manager to validate", async function () {
            await expect(
                election.connect(voter1).validateCandidate(1, true)
            ).to.be.revertedWith("Only authority or manager");
        });
    });

    describe("Voter Registration", function () {
        it("Should allow authority to register voter", async function () {
            await expect(election.connect(electionAuthority).registerVoter(voter1.address))
                .to.emit(election, "VoterRegistered")
                .withArgs(voter1.address);
            
            const voterInfo = await election.getVoterInfo(voter1.address);
            expect(voterInfo.isRegistered).to.be.true;
            expect(voterInfo.hasVoted).to.be.false;
        });

        it("Should not allow duplicate voter registration", async function () {
            await election.connect(electionAuthority).registerVoter(voter1.address);
            
            await expect(
                election.connect(electionAuthority).registerVoter(voter1.address)
            ).to.be.revertedWith("Already registered");
        });

        it("Should require VOTER role", async function () {
            const [, , , , , , , , newAddr] = await ethers.getSigners();
            
            await expect(
                election.connect(electionAuthority).registerVoter(newAddr.address)
            ).to.be.revertedWith("Address must have VOTER role first");
        });

        it("Should allow batch voter registration", async function () {
            const voters = [voter1.address, voter2.address, voter3.address];
            
            await election.connect(electionAuthority).registerVoterBatch(voters);
            
            expect(await election.getTotalVoters()).to.equal(3);
            expect((await election.getVoterInfo(voter1.address)).isRegistered).to.be.true;
            expect((await election.getVoterInfo(voter2.address)).isRegistered).to.be.true;
            expect((await election.getVoterInfo(voter3.address)).isRegistered).to.be.true;
        });

        it("Should skip invalid addresses in batch", async function () {
            const voters = [voter1.address, ethers.ZeroAddress, voter2.address];
            
            await election.connect(electionAuthority).registerVoterBatch(voters);
            
            expect(await election.getTotalVoters()).to.equal(2);
        });

        it("Should not allow batch size over 100", async function () {
            const voters = new Array(101).fill(voter1.address);
            
            await expect(
                election.connect(electionAuthority).registerVoterBatch(voters)
            ).to.be.revertedWith("Batch size too large");
        });
    });

    describe("Voting", function () {
        beforeEach(async function () {
            // Setup election
            await election.connect(electionManager).startCandidateRegistration();
            await election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await election.connect(candidate2).registerCandidate("C2", "P2", "M2", "H2");
            await election.connect(electionManager).validateCandidate(1, true);
            await election.connect(electionManager).validateCandidate(2, true);
            
            // Register voters
            await election.connect(electionAuthority).registerVoter(voter1.address);
            await election.connect(electionAuthority).registerVoter(voter2.address);
            
            // Start voting
            await time.increaseTo(startTime);
            await election.connect(electionManager).startVoting();
        });

        it("Should allow registered voter to cast vote", async function () {
            await expect(election.connect(voter1).castVote(1))
                .to.emit(election, "VoteCasted")
                .withArgs(voter1.address, 1);
            
            const voterInfo = await election.getVoterInfo(voter1.address);
            expect(voterInfo.hasVoted).to.be.true;
            expect(voterInfo.votedCandidateId).to.equal(1);
            
            const candidate = await election.getCandidateDetails(1);
            expect(candidate.voteCount).to.equal(1);
            
            const info = await election.getElectionInfo();
            expect(info.totalVotes).to.equal(1);
        });

        it("Should not allow double voting", async function () {
            await election.connect(voter1).castVote(1);
            
            await expect(election.connect(voter1).castVote(2))
                .to.be.revertedWith("Already voted");
        });

        it("Should not allow unregistered voter to vote", async function () {
            await expect(election.connect(voter3).castVote(1))
                .to.be.revertedWith("Not registered voter");
        });

        it("Should not allow voting for non-existent candidate", async function () {
            await expect(election.connect(voter1).castVote(999))
                .to.be.revertedWith("Candidate not found");
        });


it("Should not allow voting for unapproved candidate", async function () {
            // We need to create a new election to register an unapproved candidate
            const now = await time.latest();
            const Election = await ethers.getContractFactory("Election");
            const testElection = await Election.deploy(
                await roles.getAddress(),
                electionManager.address,
                "Test",
                "Desc",
                now + (10 * DAY),
                now + (17 * DAY),
                now + (7 * DAY)
            );
            
            await testElection.connect(electionManager).startCandidateRegistration();
            
            // Register approved candidates
            await testElection.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await testElection.connect(electionManager).validateCandidate(1, true);
            
            // Register unapproved candidate
            const [, , , , , , , , , unapprovedCandidate] = await ethers.getSigners();
            await testElection.connect(unapprovedCandidate).registerCandidate("C3", "P3", "M3", "H3");
            // Don't validate candidate 2 - it stays unapproved
            
            // Register voter
            await testElection.connect(electionAuthority).registerVoter(voter1.address);
            
            // Start voting
            await time.increaseTo(now + (10 * DAY));
            await testElection.connect(electionManager).startVoting();
            
            // Try to vote for unapproved candidate
            await expect(testElection.connect(voter1).castVote(2))
                .to.be.revertedWith("Candidate not approved");
        });

        it("Should not allow voting after end time", async function () {
            await time.increaseTo(endTime + 1);
            
            await expect(election.connect(voter1).castVote(1))
                .to.be.revertedWith("Voting ended");
        });

        it("Should count multiple votes correctly", async function () {
            await election.connect(voter1).castVote(1);
            await election.connect(voter2).castVote(1);
            
            const candidate = await election.getCandidateDetails(1);
            expect(candidate.voteCount).to.equal(2);
        });
    });

    describe("Results", function () {
        beforeEach(async function () {
            // Setup and complete election
            await election.connect(electionManager).startCandidateRegistration();
            await election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await election.connect(candidate2).registerCandidate("C2", "P2", "M2", "H2");
            await election.connect(electionManager).validateCandidate(1, true);
            await election.connect(electionManager).validateCandidate(2, true);
            
            await election.connect(electionAuthority).registerVoter(voter1.address);
            await election.connect(electionAuthority).registerVoter(voter2.address);
            await election.connect(electionAuthority).registerVoter(voter3.address);
            
            await time.increaseTo(startTime);
            await election.connect(electionManager).startVoting();
            
            // Cast votes
            await election.connect(voter1).castVote(1);
            await election.connect(voter2).castVote(1);
            await election.connect(voter3).castVote(2);
            
            await time.increaseTo(endTime);
            await election.connect(electionManager).endElection();
        });

        it("Should get correct winner", async function () {
            const winnerId = await election.getWinner();
            expect(winnerId).to.equal(1);
            
            const winner = await election.getCandidateDetails(winnerId);
            expect(winner.voteCount).to.equal(2);
        });

        it("Should get complete results", async function () {
            const [ids, names, voteCounts] = await election.getResults();
            
            expect(ids.length).to.equal(2);
            expect(ids[0]).to.equal(1);
            expect(ids[1]).to.equal(2);
            expect(names[0]).to.equal("C1");
            expect(names[1]).to.equal("C2");
            expect(voteCounts[0]).to.equal(2);
            expect(voteCounts[1]).to.equal(1);
        });

        it("Should not allow getting results before election ends", async function () {
            const Election = await ethers.getContractFactory("Election");
            const newElection = await Election.deploy(
                await roles.getAddress(),
                electionManager.address,
                "Test",
                "Desc",
                (await time.latest()) + (10 * DAY),
                (await time.latest()) + (17 * DAY),
                (await time.latest()) + (7 * DAY)
            );
            
            await expect(newElection.getWinner())
                .to.be.revertedWith("Election not ended");
            
            await expect(newElection.getResults())
                .to.be.revertedWith("Results not available yet");
        });

        it("Should handle tie correctly (returns first candidate)", async function () {
            // Create new election with tie
            const now = await time.latest();
            const Election = await ethers.getContractFactory("Election");
            const tieElection = await Election.deploy(
                await roles.getAddress(),
                electionManager.address,
                "Tie Test",
                "Desc",
                now + (10 * DAY),
                now + (17 * DAY),
                now + (7 * DAY)
            );
            
            await tieElection.connect(electionManager).startCandidateRegistration();
            await tieElection.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await tieElection.connect(candidate2).registerCandidate("C2", "P2", "M2", "H2");
            await tieElection.connect(electionManager).validateCandidate(1, true);
            await tieElection.connect(electionManager).validateCandidate(2, true);
            
            await tieElection.connect(electionAuthority).registerVoter(voter1.address);
            await tieElection.connect(electionAuthority).registerVoter(voter2.address);
            
            await time.increaseTo(now + (10 * DAY));
            await tieElection.connect(electionManager).startVoting();
            
            // Create tie - both get 1 vote
            await tieElection.connect(voter1).castVote(1);
            await tieElection.connect(voter2).castVote(2);
            
            await time.increaseTo(now + (17 * DAY));
            await tieElection.connect(electionManager).endElection();
            
            const winnerId = await tieElection.getWinner();
            expect(winnerId).to.equal(1); // First candidate with max votes
        });

        it("Should return 0 if no votes cast", async function () {
            const now = await time.latest();
            const Election = await ethers.getContractFactory("Election");
            const noVoteElection = await Election.deploy(
                await roles.getAddress(),
                electionManager.address,
                "No Vote Test",
                "Desc",
                now + (10 * DAY),
                now + (17 * DAY),
                now + (7 * DAY)
            );
            
            await noVoteElection.connect(electionManager).startCandidateRegistration();
            await noVoteElection.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await noVoteElection.connect(electionManager).validateCandidate(1, true);
            
            await time.increaseTo(now + (10 * DAY));
            await noVoteElection.connect(electionManager).startVoting();
            
            await time.increaseTo(now + (17 * DAY));
            await noVoteElection.connect(electionManager).endElection();
            
            const winnerId = await noVoteElection.getWinner();
            expect(winnerId).to.equal(0);
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await election.connect(electionManager).startCandidateRegistration();
            await election.connect(candidate1).registerCandidate("C1", "P1", "M1", "H1");
            await election.connect(candidate2).registerCandidate("C2", "P2", "M2", "H2");
            await election.connect(electionManager).validateCandidate(1, true);
        });

        it("Should get candidate details", async function () {
            const candidate = await election.getCandidateDetails(1);
            expect(candidate.id).to.equal(1);
            expect(candidate.name).to.equal("C1");
            expect(candidate.party).to.equal("P1");
            expect(candidate.candidateAddress).to.equal(candidate1.address);
        });

        it("Should get all approved candidates", async function () {
            const approved = await election.getAllApprovedCandidates();
            expect(approved.length).to.equal(1);
            expect(approved[0].id).to.equal(1);
        });

        it("Should get pending candidates", async function () {
            const pending = await election.getPendingCandidates();
            expect(pending.length).to.equal(1);
            expect(pending[0].id).to.equal(2);
        });

        it("Should get voter info", async function () {
            await election.connect(electionAuthority).registerVoter(voter1.address);
            
            const voterInfo = await election.getVoterInfo(voter1.address);
            expect(voterInfo.isRegistered).to.be.true;
            expect(voterInfo.hasVoted).to.be.false;
        });

        it("Should get election info", async function () {
            const info = await election.getElectionInfo();
            expect(info.name).to.equal("Test Election");
            expect(info.totalCandidates).to.equal(1);
        });

        it("Should get total voters", async function () {
            await election.connect(electionAuthority).registerVoter(voter1.address);
            await election.connect(electionAuthority).registerVoter(voter2.address);
            
            expect(await election.getTotalVoters()).to.equal(2);
        });

        it("Should get total candidates", async function () {
            expect(await election.getTotalCandidates()).to.equal(2);
        });

        it("Should check if voter has voted", async function () {
            await election.connect(electionAuthority).registerVoter(voter1.address);
            expect(await election.hasVoted(voter1.address)).to.be.false;
        });

        it("Should check if voter is registered", async function () {
            await election.connect(electionAuthority).registerVoter(voter1.address);
            expect(await election.isVoterRegistered(voter1.address)).to.be.true;
            expect(await election.isVoterRegistered(voter2.address)).to.be.false;
        });
    });
});
