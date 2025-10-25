import api from "./api.js";

// Helper: build query string for optional params
const buildQuery = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const s = qs.toString();
    return s ? `?${s}` : "";
};

/**
 * GET /api/candidates/:electionId?status=...
 */
export const getCandidatesByElection = async (electionId, status) => {
    if (!electionId) throw new Error("electionId is required");
    try {
        const query = buildQuery({ status });
        const res = await api.get(`/candidates/${electionId}${query}`);
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to load candidates";
        throw new Error(msg);
    }
};

/**
 * GET /api/candidates/:electionId/pending
 */
export const getPendingCandidates = async (electionId) => {
    if (!electionId) throw new Error("electionId is required");
    try {
        const res = await api.get(`/candidates/${electionId}/pending`);
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to load pending candidates";
        throw new Error(msg);
    }
};

/**
 * POST /api/candidates/:electionId/register
 * Body: { name, party, manifesto, imageHash, walletAddress?, candidatePrivateKey? }
 */
export const registerCandidate = async (data) => {
    if (!data || !data.electionId || !data.name || !data.party) {
        throw new Error("electionId, name and party are required");
    }
    try {
        const payload = {
            name: data.name,
            party: data.party,
            manifesto: data.manifesto || "",
            imageHash: data.imageHash || ""
        };
        if (data.walletAddress) payload.walletAddress = data.walletAddress;
        if (data.candidatePrivateKey) payload.candidatePrivateKey = data.candidatePrivateKey;

        const res = await api.post(`/candidates/${data.electionId}/register`, payload);
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Candidate registration failed";
        throw new Error(msg);
    }
};

/**
 * POST /api/candidates/:electionId/validate
 * Body: { candidateId, approve }
 */
export const validateCandidate = async (electionId, candidateId, approved) => {
    if (!electionId) throw new Error("electionId is required");
    if (candidateId == null) throw new Error("candidateId is required");
    if (approved == null) throw new Error("approved (true/false) is required");
    try {
        const res = await api.post(`/candidates/${electionId}/validate`, { candidateId, approve: !!approved });
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Candidate validation failed";
        throw new Error(msg);
    }
};

/**
 * GET /api/candidates/:electionId/candidate/:candidateId
 */
export const getCandidateDetails = async (electionId, candidateId) => {
    if (!electionId) throw new Error("electionId is required");
    if (candidateId == null) throw new Error("candidateId is required");
    try {
        const res = await api.get(`/candidates/${electionId}/candidate/${candidateId}`);
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to fetch candidate details";
        throw new Error(msg);
    }
};

/**
 * GET /api/candidates/:electionId/approved
 */
export const getApprovedCandidates = async (electionId) => {
    if (!electionId) throw new Error("electionId is required");
    try {
        const res = await api.get(`/candidates/${electionId}/approved`);
        return res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to load approved candidates";
        throw new Error(msg);
    }
};

export default {
    getCandidatesByElection,
    getPendingCandidates,
    registerCandidate,
    validateCandidate,
    getCandidateDetails,
    getApprovedCandidates
};
