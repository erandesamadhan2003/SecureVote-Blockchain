import api from "./api.js";

/**
 * castVote
 * POST /votes/cast
 * Body: { electionId, candidateId, voterPrivateKey? }
 */
export const castVote = async (electionId, candidateId, voterPrivateKey) => {
    if (!electionId) throw new Error("electionId is required");
    if (candidateId == null) throw new Error("candidateId is required");

    try {
        const payload = { electionId, candidateId };
        if (voterPrivateKey) payload.voterPrivateKey = voterPrivateKey;
        const res = await api.post("/votes/cast", payload);
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to cast vote";
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
        return res;
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
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to register voter";
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
        return res;
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