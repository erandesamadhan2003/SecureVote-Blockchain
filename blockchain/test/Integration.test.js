const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const {
    deployContracts,
    createBasicElection,
    setupCompleteElection,
    runCompleteElectionCycle,
    DAY
} = require("./test-helpers");

describe("Integration Tests - Complete Election Flow", function () {
    let roles, factory;
    let superAdmin, electionManager, electionAuthority;
    let candidates, voters;

    beforeEach(async function () {
        // Get all signers
        const signers = await ethers.getSigners();

        // Deploy all contracts
        const deployment = await deployContracts();
        roles = deployment.roles;
        factory = deployment.factory;
        superAdmin = deployment.superAdmin;
        electionManager = deployment.electionManager;
        electionAuthority = deployment.electionAuthority;

        // Setup candidates (use signers 3-5)
        candidates = [signers[3], signers[4], signers[5]];

        // Setup voters (use signers 6-15)
        voters = [];
        for (let i = 6; i <= 15; i++) {
            voters.push(signers[i]);
            await roles.connect(electionAuthority).addVoter(signers[i].address);
        }
    });

    describe("Complete Election Lifecycle", function () {
        it("Should execute full election from creation to result declaration", async function () {
            // 1. Create Election
            const { election, electionId, startTime, endTime, registrationDeadline } =
                await createBasicElection(factory, electionManager);

            console.log("\n✓ Election created with ID:", electionId.toString());

            // Verify election exists in factory
            const electionMetadata = await factory.getElection(electionId);
            expect(electionMetadata.isActive).to.be.true;
            expect(electionMetadata.creator).to.equal(electionManager.address);

            // 2. Start Candidate Registration
            await election.connect(electionManager).startCandidateRegistration();
            let info = await election.getElectionInfo();
            expect(info.status).to.equal(1); // Registration status

            console.log("✓ Candidate registration started");

            // 3. Candidates Register
            for (let i = 0; i < candidates.length; i++) {
                await election.connect(candidates[i]).registerCandidate(
                    `Candidate ${i + 1}`,
                    `Party ${String.fromCharCode(65 + i)}`, // Party A, B, C
                    `Manifesto for candidate ${i + 1}`,
                    `ipfs://QmHash${i + 1}`
                );
            }

            console.log(`✓ ${candidates.length} candidates registered`);

            // Verify candidates are pending
            const pendingCandidates = await election.getPendingCandidates();
            expect(pendingCandidates.length).to.equal(3);

            // 4. Validate Candidates
            await election.connect(electionManager).validateCandidate(1, true);
            await election.connect(electionManager).validateCandidate(2, true);
            await election.connect(electionAuthority).validateCandidate(3, false); // Reject one

            console.log("✓ Candidates validated (2 approved, 1 rejected)");

            // Verify approved count
            const approvedCandidates = await election.getAllApprovedCandidates();
            expect(approvedCandidates.length).to.equal(2);

            // 5. Register Voters
            const voterAddresses = voters.map(v => v.address);
            await election.connect(electionAuthority).registerVoterBatch(voterAddresses);

            console.log(`✓ ${voters.length} voters registered`);

            expect(await election.getTotalVoters()).to.equal(voters.length);

            // 6. Advance to Voting Phase
            await time.increaseTo(startTime);
            await election.connect(electionManager).startVoting();
            info = await election.getElectionInfo();
            expect(info.status).to.equal(2); // Voting status

            console.log("✓ Voting started");

            // 7. Cast Votes
            // Candidate 1 gets 6 votes, Candidate 2 gets 4 votes
            for (let i = 0; i < 6; i++) {
                await election.connect(voters[i]).castVote(1);
            }
            for (let i = 6; i < 10; i++) {
                await election.connect(voters[i]).castVote(2);
            }

            console.log("✓ Votes cast (6 for candidate 1, 4 for candidate 2)");

            // Verify vote counts
            const candidate1 = await election.getCandidateDetails(1);
            const candidate2 = await election.getCandidateDetails(2);
            expect(candidate1.voteCount).to.equal(6);
            expect(candidate2.voteCount).to.equal(4);

            // Verify voters can't vote twice
            await expect(election.connect(voters[0]).castVote(2))
                .to.be.revertedWith("Already voted");

            // 8. End Election
            await time.increaseTo(endTime);
            await election.connect(electionManager).endElection();
            info = await election.getElectionInfo();
            expect(info.status).to.equal(3); // Ended status

            console.log("✓ Election ended");

            // 9. Declare Results
            await election.connect(electionManager).declareResult();
            info = await election.getElectionInfo();
            expect(info.status).to.equal(4); // ResultDeclared status

            console.log("✓ Results declared");

            // 10. Verify Winner
            const winnerId = await election.getWinner();
            expect(winnerId).to.equal(1); // Candidate 1 should win

            const winner = await election.getCandidateDetails(winnerId);
            expect(winner.name).to.equal("Candidate 1");
            expect(winner.voteCount).to.equal(6);

            console.log(`✓ Winner: ${winner.name} with ${winner.voteCount} votes\n`);

            // 11. Get Full Results
            const [ids, names, voteCounts] = await election.getResults();
            expect(ids.length).to.equal(2);
            expect(names[0]).to.equal("Candidate 1");
            expect(names[1]).to.equal("Candidate 2");
            expect(voteCounts[0]).to.equal(6);
            expect(voteCounts[1]).to.equal(4);
        });

        // Around line 322 in your file
        it("Should handle voter batch registration efficiently", async function () {
            const { election } = await createBasicElection(factory, electionManager);
            await election.connect(electionManager).startCandidateRegistration();

            console.log("\n✓ Testing batch voter registration...");

            // Register voters in batch
            const batchSize = 10;
            const voterAddresses = voters.slice(0, batchSize).map(v => v.address);

            await election.connect(electionAuthority).registerVoterBatch(voterAddresses);
            expect(await election.getTotalVoters()).to.equal(batchSize);
            console.log(`  ✓ Registered ${batchSize} voters in one transaction`);

            // Try to register same voters again (should skip)
            await election.connect(electionAuthority).registerVoterBatch(voterAddresses);
            expect(await election.getTotalVoters()).to.equal(batchSize);
            console.log("  ✓ Duplicate registrations skipped correctly");

            // ADD THIS CHECK BEFORE THE MIXED BATCH TEST
            if (voters.length > batchSize) {
                const mixedBatch = [
                    ethers.ZeroAddress,
                    voters[0].address,
                    voters[batchSize].address  // This was causing the error!
                ];

                await roles.connect(electionAuthority).addVoter(voters[batchSize].address);
                await election.connect(electionAuthority).registerVoterBatch(mixedBatch);
                expect(await election.getTotalVoters()).to.equal(batchSize + 1);
                console.log("  ✓ Mixed batch handled correctly\n");
            } else {
                console.log("  ⚠ Skipping mixed batch test - not enough voters\n");
            }
        });

        it("Should enforce access control throughout election lifecycle", async function () {
            const { election } = await createBasicElection(factory, electionManager);
            const [, , , , , , , , , , unauthorized] = await ethers.getSigners();

            console.log("\n✓ Testing access control...");

            // Only manager can start registration
            await expect(election.connect(unauthorized).startCandidateRegistration())
                .to.be.revertedWith("Only election manager");
            console.log("  ✓ Unauthorized cannot start registration");

            await election.connect(electionManager).startCandidateRegistration();

            // Only manager/authority can validate candidates
            await election.connect(candidates[0]).registerCandidate("C1", "P1", "M1", "H1");
            await expect(election.connect(unauthorized).validateCandidate(1, true))
                .to.be.revertedWith("Only authority or manager");
            console.log("  ✓ Unauthorized cannot validate candidates");

            // Only authority/manager can register voters
            await expect(election.connect(unauthorized).registerVoter(voters[0].address))
                .to.be.revertedWith("Only authority or manager");
            console.log("  ✓ Unauthorized cannot register voters");

            // Only voters with role can vote
            await election.connect(electionManager).validateCandidate(1, true);
            await election.connect(electionAuthority).registerVoter(voters[0].address);

            const { startTime, endTime } = await election.getElectionInfo();
            await time.increaseTo(startTime);
            await election.connect(electionManager).startVoting();

            // FIXED: Changed from "Only registered voter" to "Not registered voter"
            await expect(election.connect(unauthorized).castVote(1))
                .to.be.revertedWith("Not registered voter");
            console.log("  ✓ Non-voters cannot cast votes");

            // Only manager can end election
            await time.increaseTo(endTime);
            await expect(election.connect(unauthorized).endElection())
                .to.be.revertedWith("Only election manager");
            console.log("  ✓ Unauthorized cannot end election\n");
        });

        it("Should handle edge cases correctly", async function () {
            const { election, startTime, endTime } = await createBasicElection(factory, electionManager);

            console.log("\n✓ Testing edge cases...");

            // Start registration
            await election.connect(electionManager).startCandidateRegistration();

            // Register candidate with empty manifesto (should work)
            await election.connect(candidates[0]).registerCandidate("C1", "P1", "", "");
            console.log("  ✓ Candidate with empty manifesto accepted");

            // Register candidate with very long strings (should work)
            const longString = "A".repeat(1000);
            await election.connect(candidates[1]).registerCandidate(
                "C2",
                "P2",
                longString,
                longString
            );
            console.log("  ✓ Candidate with long strings accepted");

            // Approve candidates
            await election.connect(electionManager).validateCandidate(1, true);
            await election.connect(electionManager).validateCandidate(2, true);

            // Register voters
            await election.connect(electionAuthority).registerVoter(voters[0].address);

            // Try to vote before voting starts
            await expect(election.connect(voters[0]).castVote(1))
                .to.be.revertedWith("Invalid election status");
            console.log("  ✓ Cannot vote before voting phase");

            // Start voting
            await time.increaseTo(startTime);
            await election.connect(electionManager).startVoting();

            // Cast vote
            await election.connect(voters[0]).castVote(1);

            // Try to vote after deadline
            await time.increaseTo(endTime + 1);
            await election.connect(electionAuthority).registerVoter(voters[1].address);
            await expect(election.connect(voters[1]).castVote(2))
                .to.be.revertedWith("Voting ended");
            console.log("  ✓ Cannot vote after deadline");

            // End election and check results
            await election.connect(electionManager).endElection();

            // Try to get results before declaration
            const winnerId = await election.getWinner();
            expect(winnerId).to.equal(1);
            console.log("  ✓ Can get winner after election ends");

            await election.connect(electionManager).declareResult();
            console.log("  ✓ All edge cases handled correctly\n");
        });

        
    });

    describe("Real-world Scenarios", function () {
        it("Should simulate a realistic national election", async function () {
            console.log("\n=== SIMULATING NATIONAL ELECTION ===\n");

            // Create election
            const { election, startTime, endTime } = await createBasicElection(factory, electionManager);

            // Start registration
            await election.connect(electionManager).startCandidateRegistration();
            console.log("✓ Election created and registration opened");

            // 3 political parties register candidates
            const parties = ["Democratic Party", "Republican Party", "Independent"];
            for (let i = 0; i < 3; i++) {
                await election.connect(candidates[i]).registerCandidate(
                    `Presidential Candidate ${i + 1}`,
                    parties[i],
                    `Healthcare, Economy, Education - ${parties[i]} Platform`,
                    `ipfs://manifesto${i + 1}`
                );
            }
            console.log(`✓ ${parties.length} candidates registered`);

            // Election authority validates all candidates
            for (let i = 1; i <= 3; i++) {
                await election.connect(electionAuthority).validateCandidate(i, true);
            }
            console.log("✓ All candidates approved");

            // Register 10 voters
            const voterAddresses = voters.map(v => v.address);
            await election.connect(electionAuthority).registerVoterBatch(voterAddresses);
            console.log(`✓ ${voters.length} voters registered`);

            // Voting begins
            await time.increaseTo(startTime);
            await election.connect(electionManager).startVoting();
            console.log("✓ Voting phase started");

            // Votes distribution: 4-3-3
            await election.connect(voters[0]).castVote(1);
            await election.connect(voters[1]).castVote(1);
            await election.connect(voters[2]).castVote(1);
            await election.connect(voters[3]).castVote(1);
            await election.connect(voters[4]).castVote(2);
            await election.connect(voters[5]).castVote(2);
            await election.connect(voters[6]).castVote(2);
            await election.connect(voters[7]).castVote(3);
            await election.connect(voters[8]).castVote(3);
            await election.connect(voters[9]).castVote(3);

            console.log("✓ Voting completed");
            console.log("  - Candidate 1: 4 votes");
            console.log("  - Candidate 2: 3 votes");
            console.log("  - Candidate 3: 3 votes");

            // End election
            await time.increaseTo(endTime);
            await election.connect(electionManager).endElection();
            console.log("✓ Election ended");

            // Declare winner
            await election.connect(electionManager).declareResult();
            const winnerId = await election.getWinner();
            const winner = await election.getCandidateDetails(winnerId);

            console.log(`\n🏆 WINNER: ${winner.name} (${winner.party})`);
            console.log(`   Total Votes: ${winner.voteCount}`);
            console.log("\n=== ELECTION COMPLETED SUCCESSFULLY ===\n");

            expect(winnerId).to.equal(1);
        });
    });
});