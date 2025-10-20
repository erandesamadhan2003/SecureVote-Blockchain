import {
    provider,
    rolesContract,
    factoryContract,
    getElectionContract,
    getSignerFromPrivateKey
} from '../config/ether.js';
import { Election } from '../models/Election.js';
import { Candidate } from '../models/Candidate.js';
import { ethers } from 'ethers';

class ContractService {

    // Check if blockchain connection is available
    static isBlockchainConnected() {
        return provider && factoryContract;
    }

    // 1. Get provider
    static getProvider() {
        return provider;
    }

    // 2. Get signer from private key (for server-side transactions)
    static getSignerFromPrivateKey(privateKey) {
        return new ethers.Wallet(privateKey, provider);
    }

    // 3. Get roles contract instance
    static getRolesContract(signerOrProvider = provider) {
        if (!rolesContract) {
            throw new Error('Roles contract not initialized');
        }
        return rolesContract.connect(signerOrProvider);
    }

    // 4. Get factory contract instance
    static getFactoryContract(signerOrProvider = provider) {
        if (!factoryContract) {
            throw new Error('ElectionFactory contract not initialized');
        }
        return factoryContract.connect(signerOrProvider);
    }

    // 5. Get election contract instance
    static getElectionContract(address, signerOrProvider = provider) {
        return getElectionContract(address, signerOrProvider);
    }

    // 6. Fetch all elections from blockchain
    static async fetchAllElectionsFromChain() {
        if (!this.isBlockchainConnected()) {
            console.log('Blockchain not connected, returning empty array');
            return [];
        }

        try {
            const factory = this.getFactoryContract();
            const electionAddresses = await factory.getAllElections();

            const elections = [];
            for (const address of electionAddresses) {
                try {
                    const electionData = await this.fetchElectionDetailsFromChain(address);
                    elections.push(electionData);
                } catch (error) {
                    console.error(`Error fetching election ${address}:`, error.message);
                }
            }

            return elections;
        } catch (error) {
            console.error('Error fetching elections from chain:', error);
            return [];
        }
    }

    // 7. Fetch single election details from blockchain
    static async fetchElectionDetailsFromChain(electionAddress) {
        if (!this.isBlockchainConnected()) {
            throw new Error('Blockchain not connected');
        }

        try {
            const electionContract = this.getElectionContract(electionAddress);

            // Get basic election info
            const electionInfo = await electionContract.getElectionInfo();

            // Get all approved candidates
            const candidates = await electionContract.getAllApprovedCandidates();

            // Parse the data - ethers v6 uses BigInt instead of BigNumber
            const parsedElection = {
                contractAddress: electionAddress,
                electionId: Number(electionInfo.id),
                name: electionInfo.name,
                description: electionInfo.description,
                startTime: new Date(Number(electionInfo.startTime) * 1000),
                endTime: new Date(Number(electionInfo.endTime) * 1000),
                registrationDeadline: new Date(Number(electionInfo.registrationDeadline) * 1000),
                status: this.mapStatus(electionInfo.status),
                totalVotes: Number(electionInfo.totalVotes),
                totalCandidates: Number(electionInfo.totalCandidates),
                creatorAddress: electionInfo.creator,
                isActive: electionInfo.isActive
            };

            // Parse candidates
            const parsedCandidates = candidates.map(candidate => ({
                candidateId: Number(candidate.id),
                candidateAddress: candidate.candidateAddress,
                name: candidate.name,
                party: candidate.party,
                manifesto: candidate.manifesto,
                imageHash: candidate.imageHash,
                voteCount: Number(candidate.voteCount),
                isApproved: candidate.isApproved
            }));

            return {
                ...parsedElection,
                candidates: parsedCandidates
            };
        } catch (error) {
            console.error(`Error fetching election details for ${electionAddress}:`, error);
            throw error;
        }
    }

    // 8. Sync election data from blockchain to MongoDB
    static async syncElectionToDB(electionAddress) {
        if (!this.isBlockchainConnected()) {
            console.log('Blockchain not connected, skipping sync');
            return null;
        }

        try {
            // Fetch from blockchain
            const electionData = await this.fetchElectionDetailsFromChain(electionAddress);

            // Update or create in MongoDB
            const election = await Election.findOneAndUpdate(
                { contractAddress: electionAddress },
                {
                    $set: {
                        electionId: electionData.electionId,
                        name: electionData.name,
                        description: electionData.description,
                        startTime: electionData.startTime,
                        endTime: electionData.endTime,
                        registrationDeadline: electionData.registrationDeadline,
                        status: electionData.status,
                        totalVotes: electionData.totalVotes,
                        totalCandidates: electionData.totalCandidates,
                        creatorAddress: electionData.creatorAddress,
                        isActive: electionData.isActive
                    }
                },
                { upsert: true, new: true }
            );

            // Sync candidates
            for (const candidateData of electionData.candidates) {
                await Candidate.findOneAndUpdate(
                    {
                        candidateId: candidateData.candidateId,
                        electionId: election.electionId
                    },
                    {
                        $set: {
                            candidateAddress: candidateData.candidateAddress,
                            name: candidateData.name,
                            party: candidateData.party,
                            manifesto: candidateData.manifesto,
                            imageHash: candidateData.imageHash,
                            voteCount: candidateData.voteCount,
                            status: candidateData.isApproved ? 'Approved' : 'Pending'
                        }
                    },
                    { upsert: true, new: true }
                );
            }

            return election;
        } catch (error) {
            console.error(`Error syncing election ${electionAddress} to DB:`, error);
            throw error;
        }
    }

    // 9. Listen to blockchain events
    static async listenToEvents() {
        if (!this.isBlockchainConnected()) {
            console.log('Blockchain not connected, skipping event listeners');
            return;
        }

        try {
            const factory = this.getFactoryContract();

            // Listen for ElectionCreated event
            factory.on('ElectionCreated', async (electionAddress, creator, timestamp) => {
                console.log(`New election created: ${electionAddress} by ${creator}`);

                // Sync the new election to database
                try {
                    await this.syncElectionToDB(electionAddress);
                    console.log(`Election ${electionAddress} synced to database`);
                } catch (error) {
                    console.error(`Failed to sync election ${electionAddress}:`, error);
                }
            });

            console.log('Listening for ElectionCreated events...');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    // Helper function to map contract status to string
    static mapStatus(statusCode) {
        const statusMap = {
            0: 'Created',
            1: 'Registration',
            2: 'Voting',
            3: 'Ended',
            4: 'ResultDeclared'
        };
        return statusMap[Number(statusCode)] || 'Unknown';
    }

    // Helper function to check if an address has a specific role
    static async checkRole(address, role) {
        if (!this.isBlockchainConnected()) {
            console.log('Blockchain not connected, cannot check role');
            return false;
        }

        try {
            const roles = this.getRolesContract();
            const hasRole = await roles.hasRole(role, address);
            return hasRole;
        } catch (error) {
            console.error('Error checking role:', error);
            return false;
        }
    }
}

// Export the listenToEvents function directly for use in server.js
export const listenToEvents = ContractService.listenToEvents.bind(ContractService);
export default ContractService;