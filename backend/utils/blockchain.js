import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RoleABI = JSON.parse(readFileSync(join(__dirname, "../../blockchain/artifacts/contracts/Roles.sol/Roles.json"))).abi;
const ROLES_CONTRACT_ADDRESS = process.env.ROLES_CONTRACT_ADDRESS;
const ElectionFactoryABI = JSON.parse(readFileSync(join(__dirname, "../../blockchain/artifacts/contracts/ElectionFactory.sol/ElectionFactory.json"))).abi;
const ELECTION_FACTORY_CONTRACT_ADDRESS = process.env.ELECTION_FACTORY_CONTRACT_ADDRESS;

// new: load Election ABI (may be empty if not compiled)
let ElectionABI = [];
try {
  ElectionABI = JSON.parse(readFileSync(join(__dirname, "../../blockchain/artifacts/contracts/Election.sol/Election.json"))).abi || [];
} catch (e) {
  console.warn("Election ABI not found or unreadable:", e.message);
}

export const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
export const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY || "", provider);

// Role Contract Instance
export const roleContract = new ethers.Contract(
    ROLES_CONTRACT_ADDRESS,
    RoleABI,
    wallet
);

// Election Factory Contract Instance
export const electionFactoryContract = new ethers.Contract(
    ELECTION_FACTORY_CONTRACT_ADDRESS,
    ElectionFactoryABI,
    wallet
);

// new: get an Election contract at a given address; if signerOrProvider provided, use it, otherwise use wallet
export const getElectionContract = (address, signerOrProvider = wallet) => {
    if (!address) throw new Error("Election contract address required");
    if (!ElectionABI || ElectionABI.length === 0) {
        // still return a contract instance (will fail on calls if ABI missing)
        console.warn("Election ABI is empty; contract interactions may fail.");
    }
    return new ethers.Contract(address, ElectionABI, signerOrProvider);
};


