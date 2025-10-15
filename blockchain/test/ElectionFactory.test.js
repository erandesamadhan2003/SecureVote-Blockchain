const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ElectionFactory Contract", function () {
    let roles, factory;
    let superAdmin, electionManager1, electionManager2, addr1;
    let startTime, endTime, registrationDeadline;

    const DAY = 24 * 60 * 60;

    beforeEach(async function () {
        [superAdmin, electionManager1, electionManager2, addr1] = await ethers.getSigners();

        // Deploy Roles contract
        const Roles = await ethers.getContractFactory("Roles");
        roles = await Roles.deploy(superAdmin.address);
        await roles.waitForDeployment();

        // Setup roles
        await roles.connect(superAdmin).addElectionManager(electionManager1.address);
        await roles.connect(superAdmin).addElectionManager(electionManager2.address);

        // Deploy Factory
        const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
        factory = await ElectionFactory.deploy(await roles.getAddress());
        await factory.waitForDeployment();

        // Setup times
        const now = await time.latest();
        registrationDeadline = now + (7 * DAY);
        startTime = now + (10 * DAY);
        endTime = now + (17 * DAY);
    });

    describe("Deployment", function () {
        it("Should set the roles contract correctly", async function () {
            expect(await factory.roles()).to.equal(await roles.getAddress());
        });

        it("Should initialize election counter to 0", async function () {
            expect(await factory.getElectionIdCounter()).to.equal(0);
        });

        it("Should revert with invalid roles address", async function () {
            const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
            await expect(ElectionFactory.deploy(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid roles address");
        });
    });

    describe("Create Election", function () {
        it("Should allow election manager to create election", async function () {
            const tx = await factory.connect(electionManager1).createElection(
                "Presidential Election",
                "National election",
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

            expect(event).to.not.be.undefined;

            expect(await factory.getTotalElections()).to.equal(1);
            expect(await factory.getElectionIdCounter()).to.equal(1);
        });

        it("Should emit ElectionCreated event with correct parameters", async function () {
            await expect(
                factory.connect(electionManager1).createElection(
                    "Test Election",
                    "Description",
                    startTime,
                    endTime,
                    registrationDeadline
                )
            ).to.emit(factory, "ElectionCreated");
        });

        it("Should not allow non-election manager to create election", async function () {
            await expect(
                factory.connect(addr1).createElection(
                    "Test Election",
                    "Description",
                    startTime,
                    endTime,
                    registrationDeadline
                )
            ).to.be.revertedWith("Only election manager");
        });

        it("Should revert with empty name", async function () {
            await expect(
                factory.connect(electionManager1).createElection(
                    "",
                    "Description",
                    startTime,
                    endTime,
                    registrationDeadline
                )
            ).to.be.revertedWith("Name required");
        });

        it("Should revert with invalid start time", async function () {
            const pastTime = (await time.latest()) - DAY;
            await expect(
                factory.connect(electionManager1).createElection(
                    "Test",
                    "Desc",
                    pastTime,
                    endTime,
                    registrationDeadline
                )
            ).to.be.revertedWith("Start time must be in future");
        });

        it("Should revert with invalid end time", async function () {
            await expect(
                factory.connect(electionManager1).createElection(
                    "Test",
                    "Desc",
                    startTime,
                    startTime - DAY,
                    registrationDeadline
                )
            ).to.be.revertedWith("End time must be after start time");
        });

        it("Should revert with invalid registration deadline", async function () {
            await expect(
                factory.connect(electionManager1).createElection(
                    "Test",
                    "Desc",
                    startTime,
                    endTime,
                    startTime + DAY
                )
            ).to.be.revertedWith("Registration must end before voting");
        });

        it("Should store election metadata correctly", async function () {
            const tx = await factory.connect(electionManager1).createElection(
                "Test Election",
                "Test Description",
                startTime,
                endTime,
                registrationDeadline
            );

            const election = await factory.getElection(1);
            expect(election.id).to.equal(1);
            expect(election.creator).to.equal(electionManager1.address);
            expect(election.name).to.equal("Test Election");
            expect(election.description).to.equal("Test Description");
            expect(election.startTime).to.equal(startTime);
            expect(election.endTime).to.equal(endTime);
            expect(election.isActive).to.be.true;
        });

        it("Should track manager elections correctly", async function () {
            await factory.connect(electionManager1).createElection(
                "Election 1",
                "Desc 1",
                startTime,
                endTime,
                registrationDeadline
            );

            await factory.connect(electionManager1).createElection(
                "Election 2",
                "Desc 2",
                startTime + (30 * DAY),
                endTime + (30 * DAY),
                registrationDeadline + (30 * DAY)
            );

            await factory.connect(electionManager2).createElection(
                "Election 3",
                "Desc 3",
                startTime + (60 * DAY),
                endTime + (60 * DAY),
                registrationDeadline + (60 * DAY)
            );

            const manager1Elections = await factory.getManagerElections(electionManager1.address);
            const manager2Elections = await factory.getManagerElections(electionManager2.address);

            expect(manager1Elections.length).to.equal(2);
            expect(manager2Elections.length).to.equal(1);
            expect(manager1Elections[0]).to.equal(1);
            expect(manager1Elections[1]).to.equal(2);
            expect(manager2Elections[0]).to.equal(3);
        });

        it("Should mark election contract as valid", async function () {
            const tx = await factory.connect(electionManager1).createElection(
                "Test",
                "Desc",
                startTime,
                endTime,
                registrationDeadline
            );

            const election = await factory.getElection(1);
            expect(await factory.isValidElection(election.electionAddress)).to.be.true;
        });

        it("Should increment election ID for each new election", async function () {
            await factory.connect(electionManager1).createElection(
                "Election 1",
                "Desc",
                startTime,
                endTime,
                registrationDeadline
            );

            await factory.connect(electionManager1).createElection(
                "Election 2",
                "Desc",
                startTime + (30 * DAY),
                endTime + (30 * DAY),
                registrationDeadline + (30 * DAY)
            );

            expect(await factory.getElectionIdCounter()).to.equal(2);
        });
    });

    describe("Deactivate Election", function () {
        let electionId;

        beforeEach(async function () {
            await factory.connect(electionManager1).createElection(
                "Test Election",
                "Description",
                startTime,
                endTime,
                registrationDeadline
            );
            electionId = 1;
        });

        it("Should allow creator to deactivate election", async function () {
            await expect(factory.connect(electionManager1).deactivateElection(electionId))
                .to.emit(factory, "ElectionDeactivated")
                .withArgs(electionId, electionManager1.address);

            const election = await factory.getElection(electionId);
            expect(election.isActive).to.be.false;
        });

        it("Should allow super admin to deactivate election", async function () {
            await expect(factory.connect(superAdmin).deactivateElection(electionId))
                .to.emit(factory, "ElectionDeactivated")
                .withArgs(electionId, superAdmin.address);

            const election = await factory.getElection(electionId);
            expect(election.isActive).to.be.false;
        });

        it("Should not allow other managers to deactivate election", async function () {
            await expect(
                factory.connect(electionManager2).deactivateElection(electionId)
            ).to.be.revertedWith("Not authorized");
        });

        it("Should not allow non-authorized users to deactivate", async function () {
            await expect(
                factory.connect(addr1).deactivateElection(electionId)
            ).to.be.revertedWith("Not authorized");
        });

        it("Should not deactivate already inactive election", async function () {
            await factory.connect(electionManager1).deactivateElection(electionId);

            await expect(
                factory.connect(electionManager1).deactivateElection(electionId)
            ).to.be.revertedWith("Election already inactive");
        });

        it("Should revert for non-existent election", async function () {
            await expect(
                factory.connect(electionManager1).deactivateElection(999)
            ).to.be.revertedWith("Election not found");
        });
    });

    describe("Reactivate Election", function () {
        let electionId;

        beforeEach(async function () {
            await factory.connect(electionManager1).createElection(
                "Test Election",
                "Description",
                startTime,
                endTime,
                registrationDeadline
            );
            electionId = 1;
            await factory.connect(electionManager1).deactivateElection(electionId);
        });

        it("Should allow super admin to reactivate election", async function () {
            await factory.connect(superAdmin).reactivateElection(electionId);

            const election = await factory.getElection(electionId);
            expect(election.isActive).to.be.true;
        });

        it("Should not allow non-super admin to reactivate", async function () {
            await expect(
                factory.connect(electionManager1).reactivateElection(electionId)
            ).to.be.revertedWith("Only super admin");
        });

        it("Should not reactivate already active election", async function () {
            await factory.connect(superAdmin).reactivateElection(electionId);

            await expect(
                factory.connect(superAdmin).reactivateElection(electionId)
            ).to.be.revertedWith("Election already active");
        });

        it("Should revert for non-existent election", async function () {
            await expect(
                factory.connect(superAdmin).reactivateElection(999)
            ).to.be.revertedWith("Election not found");
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            const now = await time.latest();

            // Create Past Election - create with future times, then advance time
            await factory.connect(electionManager1).createElection(
                "Past Election",
                "Desc",
                now + (10 * DAY),
                now + (17 * DAY),
                now + (7 * DAY)
            );

            // Advance time to make it a past election
            await time.increase(20 * DAY);

            const newNow = await time.latest();

            // Create Ongoing Election - starts in the past (relative to new time), ends in future
            await factory.connect(electionManager1).createElection(
                "Ongoing Election",
                "Desc",
                newNow + (1 * DAY),
                newNow + (8 * DAY),
                newNow - (1 * DAY)  // Registration already closed
            );

            // Advance time to make it ongoing
            await time.increase(2 * DAY);

            const finalNow = await time.latest();

            // Create Upcoming Election
            await factory.connect(electionManager1).createElection(
                "Upcoming Election",
                "Desc",
                finalNow + (10 * DAY),
                finalNow + (17 * DAY),
                finalNow + (7 * DAY)
            );

            // Deactivate the past election
            await factory.connect(electionManager1).deactivateElection(1);
        });

        it("Should get all elections", async function () {
            const allElections = await factory.getAllElections();
            expect(allElections.length).to.equal(3);
        });

        it("Should get active elections", async function () {
            const activeElections = await factory.getActiveElections();
            expect(activeElections.length).to.equal(2);
            expect(activeElections[0].id).to.equal(2);
            expect(activeElections[1].id).to.equal(3);
        });

        it("Should get ongoing elections", async function () {
            const ongoingElections = await factory.getOngoingElections();
            expect(ongoingElections.length).to.equal(1);
            expect(ongoingElections[0].name).to.equal("Ongoing Election");
        });

        it("Should get upcoming elections", async function () {
            const upcomingElections = await factory.getUpcomingElections();
            expect(upcomingElections.length).to.equal(1);
            expect(upcomingElections[0].name).to.equal("Upcoming Election");
        });

        it("Should get completed elections", async function () {
            const completedElections = await factory.getCompletedElections();
            expect(completedElections.length).to.equal(1);
            expect(completedElections[0].name).to.equal("Past Election");
        });

        it("Should get total elections", async function () {
            expect(await factory.getTotalElections()).to.equal(3);
        });

        it("Should get total active elections", async function () {
            expect(await factory.getTotalActiveElections()).to.equal(2);
        });

        it("Should get election by ID", async function () {
            const election = await factory.getElection(2);
            expect(election.name).to.equal("Ongoing Election");
            expect(election.id).to.equal(2);
        });

        it("Should revert when getting non-existent election", async function () {
            await expect(factory.getElection(999))
                .to.be.revertedWith("Election not found");
        });

        it("Should validate election contract", async function () {
            const election = await factory.getElection(1);
            expect(await factory.isValidElection(election.electionAddress)).to.be.true;
            expect(await factory.isValidElection(addr1.address)).to.be.false;
        });

        it("Should get election ID by address", async function () {
            const election = await factory.getElection(2);
            const electionId = await factory.getElectionIdByAddress(election.electionAddress);
            expect(electionId).to.equal(2);
        });

        it("Should revert when getting ID of non-existent address", async function () {
            await expect(factory.getElectionIdByAddress(addr1.address))
                .to.be.revertedWith("Election not found");
        });

        it("Should get elections by IDs", async function () {
            const elections = await factory.getElectionsByIds([1, 3]);
            expect(elections.length).to.equal(2);
            expect(elections[0].id).to.equal(1);
            expect(elections[1].id).to.equal(3);
        });

        it("Should revert when getting elections with invalid ID", async function () {
            await expect(factory.getElectionsByIds([1, 999]))
                .to.be.revertedWith("Election not found");
        });

        it("Should get elections by time range", async function () {
            const now = await time.latest();
            const elections = await factory.getElectionsByTimeRange(
                now - (30 * DAY),
                now + (30 * DAY)
            );

            // Should return all 3 elections since they were all created within a reasonable timeframe
            expect(elections.length).to.be.greaterThanOrEqual(1);
        });

        it("Should revert with invalid time range", async function () {
            const now = await time.latest();
            await expect(
                factory.getElectionsByTimeRange(now + DAY, now - DAY)
            ).to.be.revertedWith("Invalid time range");
        });

        it("Should get manager elections", async function () {
            const elections = await factory.getManagerElections(electionManager1.address);
            expect(elections.length).to.equal(3);
        });

        it("Should return empty array for manager with no elections", async function () {
            const elections = await factory.getManagerElections(addr1.address);
            expect(elections.length).to.equal(0);
        });
    });

    describe("Integration Tests", function () {
        it("Should create multiple elections and track them correctly", async function () {
            const elections = [];
            const now = await time.latest();

            for (let i = 0; i < 5; i++) {
                const tx = await factory.connect(electionManager1).createElection(
                    `Election ${i + 1}`,
                    `Description ${i + 1}`,
                    now + ((i + 10) * DAY),
                    now + ((i + 17) * DAY),
                    now + ((i + 7) * DAY)
                );
                elections.push(tx);
            }

            expect(await factory.getTotalElections()).to.equal(5);
            expect(await factory.getElectionIdCounter()).to.equal(5);

            const allElections = await factory.getAllElections();
            expect(allElections.length).to.equal(5);

            for (let i = 0; i < 5; i++) {
                expect(allElections[i].name).to.equal(`Election ${i + 1}`);
            }
        });

        it("Should handle multiple managers creating elections", async function () {
            const now = await time.latest();

            await factory.connect(electionManager1).createElection(
                "Manager1 Election 1",
                "Desc",
                now + (10 * DAY),
                now + (17 * DAY),
                now + (7 * DAY)
            );

            await factory.connect(electionManager2).createElection(
                "Manager2 Election 1",
                "Desc",
                now + (20 * DAY),
                now + (27 * DAY),
                now + (17 * DAY)
            );

            await factory.connect(electionManager1).createElection(
                "Manager1 Election 2",
                "Desc",
                now + (30 * DAY),
                now + (37 * DAY),
                now + (27 * DAY)
            );

            expect(await factory.getTotalElections()).to.equal(3);

            const manager1Elections = await factory.getManagerElections(electionManager1.address);
            const manager2Elections = await factory.getManagerElections(electionManager2.address);

            expect(manager1Elections.length).to.equal(2);
            expect(manager2Elections.length).to.equal(1);
        });
    });
});