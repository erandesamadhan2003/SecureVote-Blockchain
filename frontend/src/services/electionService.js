import api from "./api.js";
import { getContract } from "../utils/web3.js";
import { ElectionABI, ElectionStatusMap } from "../utils/constants.js";

/**
 * Helper to build query string from filters object
 */
const buildQuery = (filters = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const str = qs.toString();
    return str ? `?${str}` : "";
};

export const getAllElections = async (filters = {}) => {
    // filters: { status, search, page, limit }
    try {
        const res = await api.get(`/elections${buildQuery(filters)}`);
        return res;
    } catch (err) {
        throw err;
    }
};

export const getElectionById = async (id) => {
    if (!id) throw new Error("id is required");
    try {
        const res = await api.get(`/elections/${id}`);
        // return response body (backend sends { election: {...} } or the election object)
        const payload = res?.data ?? res;
        const election = payload?.election ?? payload;

        // if the returned election has no explicit status but has a contractAddress,
        // attempt to read on-chain getElectionInfo and enrich the object.
        try {
            if (election && !election.status && election.contractAddress) {
                const contract = getContract(election.contractAddress, ElectionABI, { withSigner: false });
                const info = await contract.getElectionInfo();
                // info may be struct/array; extract fields defensively
                const rawStatus = info?.status ?? info[5];
                let statusNum = null;
                if (rawStatus != null) {
                    if (typeof rawStatus === "object" && typeof rawStatus.toNumber === "function") statusNum = rawStatus.toNumber();
                    else statusNum = Number(rawStatus);
                }
                // map numeric to readable status when possible
                if (statusNum != null && Number.isFinite(statusNum)) {
                    election.status = ElectionStatusMap[statusNum] ?? String(statusNum);
                } else if (info?.status) {
                    election.status = String(info.status);
                }

                // normalize time fields (on-chain values are seconds)
                const maybeToIso = (v) => {
                    if (v == null) return null;
                    const n = (typeof v.toNumber === "function") ? v.toNumber() : Number(v);
                    if (!Number.isFinite(n)) return null;
                    return new Date(n * 1000).toISOString();
                };
                const onchainStart = info?.startTime ?? info[2];
                const onchainEnd = info?.endTime ?? info[3];
                const onchainReg = info?.registrationDeadline ?? info[4];
                if (!election.startTime && onchainStart) election.startTime = maybeToIso(onchainStart);
                if (!election.endTime && onchainEnd) election.endTime = maybeToIso(onchainEnd);
                if (!election.registrationDeadline && onchainReg) election.registrationDeadline = maybeToIso(onchainReg);
            }
        } catch (onChainErr) {
            // keep DB data if on-chain read fails; console.debug for diagnostics
            // eslint-disable-next-line no-console
            console.debug("on-chain electionInfo fetch failed:", onChainErr?.message || onChainErr);
        }

        return election ?? payload;
    } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Failed to fetch election";
        throw new Error(msg);
    }
};

export const getMyElections = async () => {
    try {
        const res = await api.get("/elections/my");
        // return the response body (axios puts payload in res.data)
        const data = res?.data ?? res;
        console.log("getMyElections response:", data);
        return data;
    } catch (err) {
        // surface backend message if available
        const message = err?.response?.data?.message || err?.message || "Failed to fetch my elections";
        console.error("getMyElections error:", message);
        throw new Error(message);
    }
};

export const getActiveElections = async () => {
    try {
        const res = await api.get("/elections/active");
        return res;
    } catch (err) {
        throw err;
    }
};

export const getUpcomingElections = async () => {
    try {
        const res = await api.get("/elections/upcoming");
        return res;
    } catch (err) {
        throw err;
    }
};

export const getOngoingElections = async () => {
    try {
        const res = await api.get("/elections/ongoing");
        return res;
    } catch (err) {
        throw err;
    }
};

export const getCompletedElections = async () => {
    try {
        const res = await api.get("/elections/completed");
        return res;
    } catch (err) {
        throw err;
    }
};

export const createElection = async (data) => {
    // data: { name, description, startTime, endTime, registrationDeadline }
    if (!data || !data.name || !data.startTime || !data.endTime || !data.registrationDeadline) {
        throw new Error("name, startTime, endTime and registrationDeadline are required");
    }
    try {
        const res = await api.post("/elections", data);
        return res;
    } catch (err) {
        throw err;
    }
};

/**
 * updateElectionStatus - maps status to backend lifecycle endpoints:
 *  Registration -> POST /elections/:id/start-registration
 *  Voting -> POST /elections/:id/start-voting
 *  Ended -> POST /elections/:id/end
 *  ResultDeclared -> POST /elections/:id/declare-result
 */
export const updateElectionStatus = async (id, status) => {
    if (!id) throw new Error("id is required");
    if (!status) throw new Error("status is required");

    const mapping = {
        Registration: `/elections/${id}/start-registration`,
        Voting: `/elections/${id}/start-voting`,
        Ended: `/elections/${id}/end`,
        ResultDeclared: `/elections/${id}/declare-result`
    };

    const endpoint = mapping[status];
    if (!endpoint) throw new Error("Unsupported status update");

    try {
        const res = await api.post(endpoint);
        return res;
    } catch (err) {
        // axios-style error parsing
        const message =
            err?.response?.data?.message ||
            err?.message ||
            "Failed to update election status";
        throw new Error(message);
    }
};

/**
 * deactivateElection - uses backend deactivate endpoint (POST /elections/:id/deactivate)
 */
export const deactivateElection = async (id) => {
    if (!id) throw new Error("id is required");
    try {
        const res = await api.post(`/elections/${id}/deactivate`);
        return res;
    } catch (err) {
        throw err;
    }
};

export default {
    getAllElections,
    getElectionById,
    getMyElections,
    getActiveElections,
    getUpcomingElections,
    getOngoingElections,
    getCompletedElections,
    createElection,
    updateElectionStatus,
    deactivateElection
};
