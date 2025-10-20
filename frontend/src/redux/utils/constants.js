// Contract addresses (from environment variables)
export const CONTRACT_ADDRESSES = {
    ROLES: process.env.REACT_APP_ROLES_CONTRACT_ADDRESS,
    ELECTION_FACTORY: process.env.REACT_APP_FACTORY_CONTRACT_ADDRESS,
};

// Network configuration
export const NETWORK_CONFIG = {
    CHAIN_ID: parseInt(process.env.REACT_APP_CHAIN_ID) || 11155111,
    CHAIN_NAME: 'Sepolia Testnet',
    RPC_URL: process.env.REACT_APP_SEPOLIA_RPC,
    BLOCK_EXPLORER: 'https://sepolia.etherscan.io',
};

// Role constants (should match smart contract)
export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ELECTION_MANAGER: 'ELECTION_MANAGER',
    ELECTION_AUTHORITY: 'ELECTION_AUTHORITY',
    VOTER: 'VOTER',
};

// Election status constants
export const ELECTION_STATUS = {
    CREATED: 'Created',
    REGISTRATION: 'Registration',
    VOTING: 'Voting',
    ENDED: 'Ended',
    RESULT_DECLARED: 'ResultDeclared',
};

// Transaction defaults
export const TRANSACTION_DEFAULTS = {
    GAS_LIMIT_BUFFER: 1.2, // 20% buffer for gas estimation
    CONFIRMATION_BLOCKS: 1,
    TIMEOUT: 120000, // 2 minutes
};

// Error messages
export const ERROR_MESSAGES = {
    NO_METAMASK: 'MetaMask is not installed. Please install MetaMask to use this dApp.',
    NO_ACCOUNTS: 'No accounts found. Please connect your wallet.',
    WRONG_NETWORK: 'Please switch to Sepolia Testnet to use this dApp.',
    TRANSACTION_FAILED: 'Transaction failed. Please try again.',
    INSUFFICIENT_FUNDS: 'Insufficient ETH for gas fees.',
    USER_REJECTED: 'Transaction was rejected by user.',
    CONTRACT_NOT_DEPLOYED: 'Contract not deployed at the specified address.',
};