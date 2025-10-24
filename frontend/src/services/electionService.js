import api from "./api.js";

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
        return res;
    } catch (err) {
        throw err;
    }
};

export const getMyElections = async () => {
    try {
        const res = await api.get("/elections/my");
        return res;
    } catch (err) {
        throw err;
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
        throw err;
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
