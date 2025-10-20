import { ethers } from 'ethers';

// Contract ABIs (will be imported dynamically)
let RolesABI, ElectionFactoryABI, ElectionABI;

// Load contract ABIs
export const loadContractABIs = async () => {
    if (!RolesABI) {
        try {
            const Roles = await import('../../../../blockchain/artifacts/contracts/Roles.sol/Roles.json');
            const ElectionFactory = await import('../../../../blockchain/artifacts/contracts/ElectionFactory.sol/ElectionFactory.json');
            const Election = await import('../../../../blockchain/artifacts/contracts/Election.sol/Election.json');

            RolesABI = Roles.abi    ;
            ElectionFactoryABI = ElectionFactory.abi;
            ElectionABI = Election.abi;
        } catch (error) {
            console.error('Error loading contract ABIs:', error);
            throw new Error('Failed to load contract ABIs');
        }
    }
};

// 1. Initialize provider
export const initProvider = () => {
    if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to use this dApp.');
    }

    return new ethers.BrowserProvider(window.ethereum);
};

// 2. Check network
export const checkNetwork = async (provider) => {
    try {
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const expectedChainId = Number(import.meta.env.VITE_CHAIN_ID) || 11155111;

        return {
            chainId,
            isCorrectNetwork: chainId === expectedChainId
        };
    } catch (error) {
        console.error('Error checking network:', error);
        throw new Error('Failed to check network');
    }
};

// 3. Switch to Sepolia network
export const switchToSepolia = async () => {
    try {
        const chainIdHex = `0x${Number(import.meta.env.VITE_CHAIN_ID || 11155111).toString(16)}`;

        try {
            // Try to switch to Sepolia
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainIdHex }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                // Add Sepolia network to MetaMask
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: chainIdHex,
                            chainName: 'Sepolia Testnet',
                            rpcUrls: [import.meta.env.VITE_SEPOLIA_RPC],
                            nativeCurrency: {
                                name: 'ETH',
                                symbol: 'ETH',
                                decimals: 18,
                            },
                            blockExplorerUrls: ['https://sepolia.etherscan.io'],
                        },
                    ],
                });
            } else {
                throw switchError;
            }
        }

        return true;
    } catch (error) {
        console.error('Error switching network:', error);
        throw new Error(`Failed to switch network: ${error.message}`);
    }
};

// 4. Get contract instances
export const getContractInstances = async (signer) => {
    try {
        await loadContractABIs();

        const rolesContract = new ethers.Contract(
            import.meta.env.VITE_ROLES_CONTRACT_ADDRESS,
            RolesABI,
            signer
        );

        const factoryContract = new ethers.Contract(
            import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS,
            ElectionFactoryABI,
            signer
        );

        return {
            roles: rolesContract,
            factory: factoryContract
        };
    } catch (error) {
        console.error('Error getting contract instances:', error);
        throw new Error('Failed to initialize contract instances');
    }
};

// 5. Get election contract instance
export const getElectionContract = (address, signerOrProvider) => {
    if (!ElectionABI) {
        throw new Error('Election ABI not loaded. Call loadContractABIs first.');
    }

    return new ethers.Contract(address, ElectionABI, signerOrProvider);
};

// 6. Generic function for read calls
export const callContractMethod = async (contract, method, args = []) => {
    try {
        if (!contract[method]) {
            throw new Error(`Method ${method} not found on contract`);
        }

        const result = await contract[method](...args);

        // Parse BigInt values to numbers where appropriate
        return parseContractData(result);
    } catch (error) {
        console.error(`Error calling ${method}:`, error);

        // Provide more user-friendly error messages
        if (error.message.includes('revert')) {
            throw new Error('Transaction failed. You may not have permission to perform this action.');
        } else if (error.message.includes('insufficient funds')) {
            throw new Error('Insufficient ETH for gas fees.');
        } else if (error.message.includes('user rejected')) {
            throw new Error('Transaction was rejected by user.');
        } else {
            throw new Error(`Contract call failed: ${error.message}`);
        }
    }
};

// 7. Function for write operations (transactions)
export const sendTransaction = async (contract, method, args = [], options = {}) => {
    try {
        if (!contract[method]) {
            throw new Error(`Method ${method} not found on contract`);
        }

        const tx = await contract[method](...args, options);

        // Wait for transaction confirmation
        const receipt = await tx.wait();

        return {
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            status: receipt.status === 1 ? 'success' : 'failed',
            gasUsed: receipt.gasUsed?.toString(),
            events: receipt.logs || []
        };
    } catch (error) {
        console.error(`Error sending transaction ${method}:`, error);

        // Provide more user-friendly error messages
        if (error.message.includes('revert')) {
            throw new Error('Transaction failed. You may not have permission to perform this action.');
        } else if (error.message.includes('insufficient funds')) {
            throw new Error('Insufficient ETH for gas fees.');
        } else if (error.message.includes('user rejected')) {
            throw new Error('Transaction was rejected by user.');
        } else if (error.message.includes('nonce')) {
            throw new Error('Transaction nonce error. Please try again.');
        } else {
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }
};

// 8. Parse blockchain candidate data to JS object
export const formatCandidateData = (candidateData) => {
    if (!candidateData || candidateData.length === 0) return null;

    try {
        return {
            candidateId: Number(candidateData.id),
            candidateAddress: candidateData.candidateAddress,
            name: candidateData.name,
            party: candidateData.party,
            manifesto: candidateData.manifesto,
            imageHash: candidateData.imageHash,
            voteCount: Number(candidateData.voteCount),
            isApproved: candidateData.isApproved
        };
    } catch (error) {
        console.error('Error formatting candidate data:', error);
        return null;
    }
};

// 9. Parse blockchain election data to JS object
export const formatElectionData = (electionData) => {
    if (!electionData || electionData.length === 0) return null;

    try {
        return {
            electionId: Number(electionData.id),
            name: electionData.name,
            description: electionData.description,
            startTime: new Date(Number(electionData.startTime) * 1000),
            endTime: new Date(Number(electionData.endTime) * 1000),
            registrationDeadline: new Date(Number(electionData.registrationDeadline) * 1000),
            status: mapElectionStatus(Number(electionData.status)),
            totalVotes: Number(electionData.totalVotes),
            totalCandidates: Number(electionData.totalCandidates),
            creatorAddress: electionData.creator,
            isActive: electionData.isActive
        };
    } catch (error) {
        console.error('Error formatting election data:', error);
        return null;
    }
};

// 10. Map election status code to string
export const mapElectionStatus = (statusCode) => {
    const statusMap = {
        0: 'Created',
        1: 'Registration',
        2: 'Voting',
        3: 'Ended',
        4: 'ResultDeclared'
    };

    return statusMap[statusCode] || 'Unknown';
};

// 11. Parse contract data (handle BigInt conversion)
export const parseContractData = (data) => {
    if (data === null || data === undefined) return data;

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => parseContractData(item));
    }

    // Handle BigInt
    if (typeof data === 'bigint') {
        return Number(data);
    }

    // Handle objects (like contract structs)
    if (typeof data === 'object' && data !== null) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            // Skip function properties
            if (typeof value !== 'function') {
                result[key] = parseContractData(value);
            }
        }
        return result;
    }

    return data;
};

// 12. Estimate gas for transaction
export const estimateGas = async (contract, method, args = []) => {
    try {
        const gasEstimate = await contract[method].estimateGas(...args);
        return Number(gasEstimate);
    } catch (error) {
        console.error('Error estimating gas:', error);
        throw new Error(`Gas estimation failed: ${error.message}`);
    }
};

// 13. Check if address has role
export const checkUserRole = async (rolesContract, address, role) => {
    try {
        return await callContractMethod(rolesContract, 'hasRole', [role, address]);
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
};

// 14. Get all user roles
export const getUserRoles = async (rolesContract, address) => {
    try {
        const roles = [];

        // Define role constants (should match your smart contract)
        const ROLE_CONSTANTS = {
            SUPER_ADMIN: ethers.keccak256(ethers.toUtf8Bytes('SUPER_ADMIN')),
            ELECTION_MANAGER: ethers.keccak256(ethers.toUtf8Bytes('ELECTION_MANAGER')),
            ELECTION_AUTHORITY: ethers.keccak256(ethers.toUtf8Bytes('ELECTION_AUTHORITY')),
            VOTER: ethers.keccak256(ethers.toUtf8Bytes('VOTER'))
        };

        // Check each role
        for (const [roleName, roleHash] of Object.entries(ROLE_CONSTANTS)) {
            const hasRole = await checkUserRole(rolesContract, address, roleHash);
            if (hasRole) {
                roles.push(roleName);
            }
        }

        return roles;
    } catch (error) {
        console.error('Error getting user roles:', error);
        return [];
    }
};

// 15. Validate Ethereum address
export const isValidAddress = (address) => {
    return ethers.isAddress(address);
};

// 16. Format address for display
export const formatAddress = (address, startLength = 6, endLength = 4) => {
    if (!address || !isValidAddress(address)) return 'Invalid Address';

    return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
};

// 17. Format Ether value
export const formatEther = (value) => {
    return ethers.formatEther(value);
};

// 18. Parse Ether value
export const parseEther = (value) => {
    return ethers.parseEther(value);
};