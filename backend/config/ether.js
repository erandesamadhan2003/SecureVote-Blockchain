import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

// Use createRequire for JSON imports
const require = createRequire(import.meta.url);
const Roles = require("../../blockchain/artifacts/contracts/Roles.sol/Roles.json");
const ElectionFactory = require("../../blockchain/artifacts/contracts/ElectionFactory.sol/ElectionFactory.json");
const Election = require("../../blockchain/artifacts/contracts/Election.sol/Election.json");

// For ethers v6, use JsonRpcProvider directly
export const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const RolesABI = Roles.abi;
const ElectionFactoryABI = ElectionFactory.abi;
const ElectionABI = Election.abi;

// Create contract instances with error handling
let rolesContract, factoryContract;

try {
  if (process.env.ROLES_CONTRACT_ADDRESS && process.env.ROLES_CONTRACT_ADDRESS !== '0x...') {
    rolesContract = new ethers.Contract(
      process.env.ROLES_CONTRACT_ADDRESS,
      RolesABI,
      provider
    );
    console.log('Roles contract initialized');
  } else {
    console.log('Roles contract address not configured');
  }
} catch (error) {
  console.error('Error initializing Roles contract:', error.message);
}

try {
  if (process.env.ELECTION_FACTORY_CONTRACT_ADDRESS && process.env.ELECTION_FACTORY_CONTRACT_ADDRESS !== '0x...') {
    factoryContract = new ethers.Contract(
      process.env.ELECTION_FACTORY_CONTRACT_ADDRESS,
      ElectionFactoryABI,
      provider
    );
    console.log('ElectionFactory contract initialized');
  } else {
    console.log('ElectionFactory contract address not configured');
  }
} catch (error) {
  console.error('Error initializing ElectionFactory contract:', error.message);
}

export { rolesContract, factoryContract };

export const getElectionContract = (address, signerOrProvider = provider) => {
  if (!address) {
    throw new Error('Election contract address is required');
  }
  return new ethers.Contract(address, ElectionABI, signerOrProvider);
};

export const getSignerFromPrivateKey = () => {
  if (!process.env.ADMIN_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY === 'xyz') {
    throw new Error("ADMIN_PRIVATE_KEY is not properly defined in environment variables");
  }
  return new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
};