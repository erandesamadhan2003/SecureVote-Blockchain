// Use default JSON imports and read .abi to avoid named-export errors
import RolesJson from "../contracts/abis/Roles.json";
import ElectionFactoryJson from "../contracts/abis/ElectionFactory.json";
import ElectionJson from "../contracts/abis/Election.json";

// Addresses from env
export const ROLES_CONTRACT_ADDRESS = import.meta.env.VITE_ROLES_CONTRACT || "";
export const ELECTION_FACTORY_CONTRACT_ADDRESS = import.meta.env.VITE_FACTORY_CONTRACT || "";

export const RoleNames = {
    SUPER_ADMIN: "SUPER_ADMIN",
    ELECTION_MANAGER: "ELECTION_MANAGER",
    ELECTION_AUTHORITY: "ELECTION_AUTHORITY",
    VOTER: "VOTER",
    USER: "USER"
};

export const ElectionStatus = {
    Created: "Created",
    Registration: "Registration",
    Voting: "Voting",
    Ended: "Ended",
    ResultDeclared: "ResultDeclared"
};

// numeric -> string map to decode on-chain enum values (index => name)
export const ElectionStatusMap = {
    0: ElectionStatus.Created,
    1: ElectionStatus.Registration,
    2: ElectionStatus.Voting,
    3: ElectionStatus.Ended,
    4: ElectionStatus.ResultDeclared
};

export const CandidateStatus = {
    Pending: "Pending",
    Approved: "Approved",
    Rejected: "Rejected"
};

export const NETWORK = {
    SEPOLIA_CHAIN_ID: Number(import.meta.env.VITE_CHAIN_ID || 11155111),
    RPC_URL: import.meta.env.VITE_SEPOLIA_RPC || ""
};

export const API = {
    BASE: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
    AUTH: `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/auth`,
    ELECTIONS: `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/elections`,
    CANDIDATES: `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/candidates`,
    ROLES: `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/roles`
};

export const ERRORS = {
    MISSING_FIELDS: "Required fields missing",
    NOT_FOUND: "Resource not found",
    UNAUTHORIZED: "Unauthorized",
    INVALID_WALLET: "Invalid wallet address",
    SERVER_ERROR: "Server error, try again later"
};

export const SUCCESS = {
    REGISTERED: "Registered successfully",
    LOGGED_IN: "Logged in successfully",
    LOGGED_OUT: "Logged out",
    ELECTION_CREATED: "Election created",
    TX_SUBMITTED: "Transaction submitted"
};

// ABI exports — prefer JSON's .abi, fallback to the root if formatted differently, otherwise empty array
export const RoleABI = (RolesJson && (RolesJson.abi || RolesJson)) || [];
export const ElectionFactoryABI = (ElectionFactoryJson && (ElectionFactoryJson.abi || ElectionFactoryJson)) || [];
export const ElectionABI = (ElectionJson && (ElectionJson.abi || ElectionJson)) || [];

export default {
    RoleABI,
    ElectionFactoryABI,
    ElectionABI,
    ElectionStatusMap
};