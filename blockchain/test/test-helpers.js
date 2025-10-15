const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const DAY = 24 * 60 * 60;
const HOUR = 60 * 60;
const MINUTE = 60;

/**
 * Deploy all contracts with proper setup
 */
async function deployContracts() {
    const [superAdmin, electionManager, electionAuthority, ...others] = await ethers.getSigners();

    // Deploy Roles
    const Roles = await ethers.getContractFactory("Roles");
    const roles = await Roles.deploy(superAdmin.address);
    await roles.waitForDeployment();

    // Setup roles
    await roles.connect(superAdmin).addElectionManager(electionManager.address);
    await roles.connect(electionManager).addElectionAuthority(electionAuthority.address);

    // Deploy Factory
    const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    const factory = await ElectionFactory.deploy(await roles.getAddress());
    await factory.waitForDeployment();

    return {
        roles,
        factory,
        superAdmin,
        electionManager,
        electionAuthority,
        others
    };
}

/**
 * Create a basic election with default times
 */
async function createBasicElection(factory, electionManager, daysOffset = 0) {
    const now = await time.latest();
    const registrationDeadline = now + ((7 + daysOffset) * DAY);
    const startTime = now + ((10 + daysOffset) * DAY);
    const endTime = now + ((17 + daysOffset) * DAY);

    const tx = await factory.connect(electionManager).createElection(
        "Test Election",
        "Test Description",
        startTime,
        endTime,
        registrationDeadline
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
        try {
            return factory.interface.parseLog(log).name === "ElectionCreated";
        } catch (e) {
            return false;
        }
    });

    const parsedEvent = factory.interface.parseLog(event);
    const electionAddress = parsedEvent.args.electionAddress;

    const Election = await ethers.getContractFactory("Election");
    const election = Election.attach(electionAddress);

    return {
        election,
        electionAddress,
        electionId: parsedEvent.args.electionId,
        startTime,
        endTime,
        registrationDeadline
    };
}

/**
 * Setup a complete election with candidates and voters
 */
async function setupCompleteElection(election, roles, electionManager, electionAuthority, candidates, voters) {
    // Start registration
    await election.connect(electionManager).startCandidateRegistration();

    // Register candidates
    for (let i = 0; i < candidates.length; i++) {
        await election.connect(candidates[i]).registerCandidate(
            `Candidate ${i + 1}`,
            `Party ${i + 1}`,
            `Manifesto ${i + 1}`,
            `ipfs://hash${i + 1}`
        );
    }

    // Approve all candidates
    for (let i = 1; i <= candidates.length; i++) {
        await election.connect(electionManager).validateCandidate(i, true);
    }

    // Add voter roles if not already added
    for (const voter of voters) {
        if (!(await roles.isVoter(voter.address))) {
            await roles.connect(electionAuthority).addVoter(voter.address);
        }
    }

    // Register voters in election
    const voterAddresses = voters.map(v => v.address);
    await election.connect(electionAuthority).registerVoterBatch(voterAddresses);

    return { candidateCount: candidates.length, voterCount: voters.length };
}

/**
 * Advance time to specific election phase
 */
async function advanceToPhase(phase, startTime, endTime, registrationDeadline) {
    const now = await time.latest();

    switch (phase) {
        case "registration":
            if (now < registrationDeadline) {
                await time.increaseTo(registrationDeadline - DAY);
            }
            break;
        case "voting":
            await time.increaseTo(startTime + HOUR);
            break;
        case "ended":
            await time.increaseTo(endTime + HOUR);
            break;
        default:
            throw new Error("Invalid phase");
    }
}

/**
 * Cast multiple votes
 */
async function castVotes(election, voters, candidateIds) {
    const votes = [];
    for (let i = 0; i < voters.length; i++) {
        const candidateId = candidateIds[i % candidateIds.length];
        const tx = await election.connect(voters[i]).castVote(candidateId);
        votes.push({ voter: voters[i].address, candidateId, tx });
    }
    return votes;
}

/**
 * Get election status as string
 */
function getStatusString(status) {
    const statuses = ["Created", "Registration", "Voting", "Ended", "ResultDeclared"];
    return statuses[status] || "Unknown";
}

/**
 * Get candidate status as string
 */
function getCandidateStatusString(status) {
    const statuses = ["Pending", "Approved", "Rejected"];
    return statuses[status] || "Unknown";
}

/**
 * Create voters with VOTER role
 */
async function createVoters(roles, electionAuthority, count) {
    const signers = await ethers.getSigners();
    const voters = signers.slice(10, 10 + count); // Start from index 10 to avoid conflicts

    for (const voter of voters) {
        await roles.connect(electionAuthority).addVoter(voter.address);
    }

    return voters;
}

/**
 * Generate election times based on current block time
 */
async function generateElectionTimes(daysFromNow = {
    registrationDeadline: 7,
    startTime: 10,
    endTime: 17
}) {
    const now = await time.latest();

    return {
        registrationDeadline: now + (daysFromNow.registrationDeadline * DAY),
        startTime: now + (daysFromNow.startTime * DAY),
        endTime: now + (daysFromNow.endTime * DAY),
        now
    };
}

/**
 * Wait for transaction and get event
 */
async function getEventFromTx(tx, contract, eventName) {
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
        try {
            return contract.interface.parseLog(log).name === eventName;
        } catch (e) {
            return false;
        }
    });

    if (!event) return null;
    return contract.interface.parseLog(event);
}

/**
 * Deploy a standalone election (without factory)
 */
async function deployStandaloneElection(roles, electionManager, times) {
    const Election = await ethers.getContractFactory("Election");
    const election = await Election.deploy(
        await roles.getAddress(),
        electionManager.address,
        "Standalone Election",
        "Test Description",
        times.startTime,
        times.endTime,
        times.registrationDeadline
    );
    await election.waitForDeployment();

    return election;
}

/**
 * Run a complete election cycle
 */
async function runCompleteElectionCycle(
    election,
    electionManager,
    candidates,
    voters,
    votesDistribution // e.g., [2, 3, 1] means candidate 1 gets 2 votes, candidate 2 gets 3, etc.
) {
    const { startTime, endTime } = await election.getElectionInfo();

    // Start registration
    await election.connect(electionManager).startCandidateRegistration();

    // Advance to voting
    await time.increaseTo(startTime);
    await election.connect(electionManager).startVoting();

    // Cast votes according to distribution
    let voterIndex = 0;
    for (let candidateId = 1; candidateId <= votesDistribution.length; candidateId++) {
        const voteCount = votesDistribution[candidateId - 1];
        for (let i = 0; i < voteCount; i++) {
            if (voterIndex < voters.length) {
                await election.connect(voters[voterIndex]).castVote(candidateId);
                voterIndex++;
            }
        }
    }

    // End election
    await time.increaseTo(endTime);
    await election.connect(electionManager).endElection();

    // Declare result
    await election.connect(electionManager).declareResult();

    return {
        winnerId: await election.getWinner(),
        totalVotes: (await election.getElectionInfo()).totalVotes
    };
}

/**
 * Expect revert with specific error
 */
async function expectRevert(promise, errorMessage) {
    try {
        await promise;
        throw new Error("Expected transaction to revert");
    } catch (error) {
        if (error.message.includes(errorMessage)) {
            return true;
        }
        throw error;
    }
}

/**
 * Print election summary (for debugging)
 */
async function printElectionSummary(election) {
    const info = await election.getElectionInfo();
    const totalCandidates = await election.getTotalCandidates();
    const totalVoters = await election.getTotalVoters();

    console.log("\n===== ELECTION SUMMARY =====");
    console.log(`Name: ${info.name}`);
    console.log(`Status: ${getStatusString(info.status)}`);
    console.log(`Total Candidates: ${totalCandidates}`);
    console.log(`Approved Candidates: ${info.totalCandidates}`);
    console.log(`Total Registered Voters: ${totalVoters}`);
    console.log(`Total Votes Cast: ${info.totalVotes}`);
    console.log(`Start Time: ${new Date(Number(info.startTime) * 1000).toISOString()}`);
    console.log(`End Time: ${new Date(Number(info.endTime) * 1000).toISOString()}`);
    console.log("============================\n");
}

/**
 * Print candidate results (for debugging)
 */
async function printCandidateResults(election) {
    const [ids, names, voteCounts] = await election.getResults();

    console.log("\n===== CANDIDATE RESULTS =====");
    for (let i = 0; i < ids.length; i++) {
        console.log(`${i + 1}. ${names[i]} - ${voteCounts[i]} votes`);
    }
    console.log("============================\n");
}

module.exports = {
    DAY,
    HOUR,
    MINUTE,
    deployContracts,
    createBasicElection,
    setupCompleteElection,
    advanceToPhase,
    castVotes,
    getStatusString,
    getCandidateStatusString,
    createVoters,
    generateElectionTimes,
    getEventFromTx,
    deployStandaloneElection,
    runCompleteElectionCycle,
    expectRevert,
    printElectionSummary,
    printCandidateResults
};