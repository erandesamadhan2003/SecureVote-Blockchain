import api from "./api.js";
import { getContract, getProvider, getSigner } from "../utils/web3.js";
import { ElectionABI } from "../utils/constants.js";
import electionService from "./electionService.js";

/**
 * castVote
 * POST /votes/cast OR client-side via wallet
 * Body: { electionId, candidateId, voterPrivateKey? }
 */
export const castVote = async (electionId, candidateId, voterPrivateKey) => {
    if (!electionId) throw new Error("electionId is required");
    if (candidateId == null) throw new Error("candidateId is required");

    // Try client-side (wallet) first if no voterPrivateKey provided
    if (!voterPrivateKey && typeof window !== "undefined" && window.ethereum) {
        try {
            // Resolve contract address from election
            const ev = await electionService.getElectionById(electionId);
            const election = ev?.election ?? ev ?? null;
            const contractAddress = election?.contractAddress ?? election?.contractAddress ?? election?.contractAddress;
            if (!contractAddress) {
                // fallback to server if contract address not known
                throw new Error("Election contract address not found for client-side vote");
            }

            // Use web3 helper to get contract with user's signer
            const provider = getProvider();
            const signer = getSigner(provider);
            if (!signer) throw new Error("Unable to access wallet signer");
            const contract = getContract(contractAddress, ElectionABI, { withSigner: true, provider });

            const tx = await contract.castVote(candidateId);
            const receipt = await tx.wait();
            return { txHash: tx.hash, blockNumber: receipt.blockNumber, source: "client" };
        } catch (err) {
            // Try to extract revert reason from common shapes
            const nestedMsg = err?.error?.message || err?.message || (err && String(err));
            const lower = String(nestedMsg || "").toLowerCase();

            // If it's the "Only registered voter" revert, do NOT fallback to server.
            if (lower.includes("only registered voter") || lower.includes("only registered") && lower.includes("voter")) {
                throw new Error("Only registered voter — your wallet is not registered to vote. Please register for this election or ask an authority to register you before voting.");
            }

            // For other client-side failures, log and fall back to server
            console.warn("Client-side vote failed, falling back to server:", err?.message || err);
        }
    }

    // Server-side fallback: post to API (expects voterPrivateKey if server-side signing required)
    try {
        const payload = { electionId, candidateId };
        if (voterPrivateKey) payload.voterPrivateKey = voterPrivateKey;
        const res = await api.post("/votes/cast", payload);
        return res?.data ?? res;
    } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Failed to cast vote";
        throw new Error(msg);
    }
};

/**
 * checkVotingStatus (alias for hasVoted)
 * GET /votes/has-voted/:electionId?address=<optional>
 * Returns whether provided address (or authenticated user) has voted in the given election
 */
export const checkVotingStatus = async (electionId, address) => {
    if (!electionId) throw new Error("electionId is required");
    try {
        const url = address ? `/votes/has-voted/${electionId}?address=${encodeURIComponent(address)}` : `/votes/has-voted/${electionId}`;
        const res = await api.get(url);
        return res?.data ?? res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to check voting status";
        throw new Error(msg);
    }
};

/**
 * registerVoter
 * POST /votes/register-voter
 * Body: { electionId, voterAddress }
 */
export const registerVoter = async (electionId, voterAddress) => {
    if (!electionId) throw new Error("electionId is required");
    if (!voterAddress) throw new Error("voterAddress is required");
    try {
        const res = await api.post("/votes/register-voter", { electionId, voterAddress });
        return res?.data ?? res;
    } catch (err) {
        // prefer backend message when present (axios)
        const msg = err?.response?.data?.message || err?.message || "Failed to register voter";
        throw new Error(msg);
    }
};

/**
 * registerVotersBatch
 * POST /votes/register-voters-batch
 * Body: { electionId, voters: [...] }
 */
export const registerVotersBatch = async (electionId, voters) => {
    if (!electionId) throw new Error("electionId is required");
    if (!Array.isArray(voters) || voters.length === 0) throw new Error("voters array is required");
    try {
        const res = await api.post("/votes/register-voters-batch", { electionId, voters });
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to register voters batch";
        throw new Error(msg);
    }
};

/**
 * getVoterInfo
 * GET /votes/voter-info/:electionId?address=<optional>
 */
export const getVoterInfo = async (electionId, address) => {
    if (!electionId) throw new Error("electionId is required");
    try {
        const url = address ? `/votes/voter-info/${electionId}?address=${encodeURIComponent(address)}` : `/votes/voter-info/${electionId}`;
        const res = await api.get(url);
        return res?.data ?? res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to fetch voter info";
        throw new Error(msg);
    }
};

/**
 * getTotalVoters
 * GET /votes/total/:electionId
 */
export const getTotalVoters = async (electionId) => {
    if (!electionId) throw new Error("electionId is required");
    try {
        const res = await api.get(`/votes/total/${electionId}`);
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to fetch total voters";
        throw new Error(msg);
    }
};

export default {
    castVote,
    checkVotingStatus,
    registerVoter,
    registerVotersBatch,
    getVoterInfo,
    getTotalVoters
};