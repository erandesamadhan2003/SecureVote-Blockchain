const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Roles Contract", function () {
    let roles;
    let superAdmin;
    let electionManager;
    let electionAuthority;
    let voter;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [superAdmin, electionManager, electionAuthority, voter, addr1, addr2] = await ethers.getSigners();

        const Roles = await ethers.getContractFactory("Roles");
        roles = await Roles.deploy(superAdmin.address);
        await roles.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the super admin correctly", async function () {
            expect(await roles.isSuperAdmin(superAdmin.address)).to.be.true;
        });

        it("Should grant DEFAULT_ADMIN_ROLE to super admin", async function () {
            const DEFAULT_ADMIN_ROLE = await roles.DEFAULT_ADMIN_ROLE();
            expect(await roles.hasRole(DEFAULT_ADMIN_ROLE, superAdmin.address)).to.be.true;
        });

        it("Should emit SuperAdminAdded event", async function () {
            const Roles = await ethers.getContractFactory("Roles");
            const newRoles = await Roles.deploy(superAdmin.address);
            await expect(newRoles.deploymentTransaction())
                .to.emit(newRoles, "SuperAdminAdded")
                .withArgs(superAdmin.address);
        });

        it("Should revert if super admin address is zero", async function () {
            const Roles = await ethers.getContractFactory("Roles");
            await expect(Roles.deploy(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid super admin address");
        });
    });

    describe("Super Admin Functions", function () {
        it("Should allow super admin to add another super admin", async function () {
            await expect(roles.connect(superAdmin).addSuperAdmin(addr1.address))
                .to.emit(roles, "SuperAdminAdded")
                .withArgs(addr1.address);
            
            expect(await roles.isSuperAdmin(addr1.address)).to.be.true;
        });

        it("Should allow super admin to add election manager", async function () {
            await expect(roles.connect(superAdmin).addElectionManager(electionManager.address))
                .to.emit(roles, "ElectionManagerAdded")
                .withArgs(electionManager.address);
            
            expect(await roles.isElectionManager(electionManager.address)).to.be.true;
        });

        it("Should not allow non-super admin to add super admin", async function () {
            await expect(roles.connect(addr1).addSuperAdmin(addr2.address))
                .to.be.revertedWith("Restricted to SUPER_ADMIN");
        });

        it("Should not allow adding zero address as super admin", async function () {
            await expect(roles.connect(superAdmin).addSuperAdmin(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid address");
        });

        it("Should allow super admin to remove another super admin", async function () {
            await roles.connect(superAdmin).addSuperAdmin(addr1.address);
            
            const SUPER_ADMIN_ROLE = await roles.SUPER_ADMIN();
            await expect(roles.connect(superAdmin).removeSuperAdmin(addr1.address))
                .to.emit(roles, "RoleRemoved")
                .withArgs(SUPER_ADMIN_ROLE, addr1.address);
            
            expect(await roles.isSuperAdmin(addr1.address)).to.be.false;
        });

        it("Should not allow super admin to remove themselves", async function () {
            await expect(roles.connect(superAdmin).removeSuperAdmin(superAdmin.address))
                .to.be.revertedWith("Cannot remove yourself");
        });

        it("Should allow super admin to remove election manager", async function () {
            await roles.connect(superAdmin).addElectionManager(electionManager.address);
            
            const ELECTION_MANAGER_ROLE = await roles.ELECTION_MANAGER();
            await expect(roles.connect(superAdmin).removeElectionManager(electionManager.address))
                .to.emit(roles, "RoleRemoved")
                .withArgs(ELECTION_MANAGER_ROLE, electionManager.address);
            
            expect(await roles.isElectionManager(electionManager.address)).to.be.false;
        });
    });

    describe("Election Manager Functions", function () {
        beforeEach(async function () {
            await roles.connect(superAdmin).addElectionManager(electionManager.address);
        });

        it("Should allow election manager to add election authority", async function () {
            await expect(roles.connect(electionManager).addElectionAuthority(electionAuthority.address))
                .to.emit(roles, "ElectionAuthorityAdded")
                .withArgs(electionAuthority.address);
            
            expect(await roles.isElectionAuthority(electionAuthority.address)).to.be.true;
        });

        it("Should not allow non-election manager to add election authority", async function () {
            await expect(roles.connect(addr1).addElectionAuthority(electionAuthority.address))
                .to.be.revertedWith("Restricted to ELECTION_MANAGER");
        });

        it("Should not allow adding zero address as election authority", async function () {
            await expect(roles.connect(electionManager).addElectionAuthority(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid address");
        });

        it("Should allow election manager to remove election authority", async function () {
            await roles.connect(electionManager).addElectionAuthority(electionAuthority.address);
            
            const ELECTION_AUTHORITY_ROLE = await roles.ELECTION_AUTHORITY();
            await expect(roles.connect(electionManager).removeElectionAuthority(electionAuthority.address))
                .to.emit(roles, "RoleRemoved")
                .withArgs(ELECTION_AUTHORITY_ROLE, electionAuthority.address);
            
            expect(await roles.isElectionAuthority(electionAuthority.address)).to.be.false;
        });

        it("Should allow election manager to add voter", async function () {
            await roles.connect(electionManager).addElectionAuthority(electionAuthority.address);
            
            await expect(roles.connect(electionManager).addVoter(voter.address))
                .to.emit(roles, "VoterAdded")
                .withArgs(voter.address);
            
            expect(await roles.isVoter(voter.address)).to.be.true;
        });
    });

    describe("Election Authority Functions", function () {
        beforeEach(async function () {
            await roles.connect(superAdmin).addElectionManager(electionManager.address);
            await roles.connect(electionManager).addElectionAuthority(electionAuthority.address);
        });

        it("Should allow election authority to add voter", async function () {
            await expect(roles.connect(electionAuthority).addVoter(voter.address))
                .to.emit(roles, "VoterAdded")
                .withArgs(voter.address);
            
            expect(await roles.isVoter(voter.address)).to.be.true;
        });

        it("Should not allow adding zero address as voter", async function () {
            await expect(roles.connect(electionAuthority).addVoter(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid address");
        });

        it("Should allow election authority to remove voter", async function () {
            await roles.connect(electionAuthority).addVoter(voter.address);
            
            const VOTER_ROLE = await roles.VOTER();
            await expect(roles.connect(electionAuthority).removeVoter(voter.address))
                .to.emit(roles, "RoleRemoved")
                .withArgs(VOTER_ROLE, voter.address);
            
            expect(await roles.isVoter(voter.address)).to.be.false;
        });

        it("Should not allow non-authority/manager to add voter", async function () {
            await expect(roles.connect(addr1).addVoter(voter.address))
                .to.be.revertedWith("Restricted to ELECTION_AUTHORITY or ELECTION_MANAGER");
        });

        it("Should not allow non-authority/manager to remove voter", async function () {
            await roles.connect(electionAuthority).addVoter(voter.address);
            
            await expect(roles.connect(addr1).removeVoter(voter.address))
                .to.be.revertedWith("Restricted to ELECTION_AUTHORITY or ELECTION_MANAGER");
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await roles.connect(superAdmin).addElectionManager(electionManager.address);
            await roles.connect(electionManager).addElectionAuthority(electionAuthority.address);
            await roles.connect(electionAuthority).addVoter(voter.address);
        });

        it("Should correctly identify super admin", async function () {
            expect(await roles.isSuperAdmin(superAdmin.address)).to.be.true;
            expect(await roles.isSuperAdmin(addr1.address)).to.be.false;
        });

        it("Should correctly identify election manager", async function () {
            expect(await roles.isElectionManager(electionManager.address)).to.be.true;
            expect(await roles.isElectionManager(addr1.address)).to.be.false;
        });

        it("Should correctly identify election authority", async function () {
            expect(await roles.isElectionAuthority(electionAuthority.address)).to.be.true;
            expect(await roles.isElectionAuthority(addr1.address)).to.be.false;
        });

        it("Should correctly identify voter", async function () {
            expect(await roles.isVoter(voter.address)).to.be.true;
            expect(await roles.isVoter(addr1.address)).to.be.false;
        });
    });

    describe("Role Constants", function () {
        it("Should have correct role hashes", async function () {
            const SUPER_ADMIN = await roles.SUPER_ADMIN();
            const ELECTION_MANAGER = await roles.ELECTION_MANAGER();
            const ELECTION_AUTHORITY = await roles.ELECTION_AUTHORITY();
            const VOTER = await roles.VOTER();

            expect(SUPER_ADMIN).to.equal(ethers.keccak256(ethers.toUtf8Bytes("SUPER_ADMIN")));
            expect(ELECTION_MANAGER).to.equal(ethers.keccak256(ethers.toUtf8Bytes("ELECTION_MANAGER")));
            expect(ELECTION_AUTHORITY).to.equal(ethers.keccak256(ethers.toUtf8Bytes("ELECTION_AUTHORITY")));
            expect(VOTER).to.equal(ethers.keccak256(ethers.toUtf8Bytes("VOTER")));
        });
    });
});