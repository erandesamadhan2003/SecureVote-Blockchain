import api from "./api.js";

/**
 * Helper to extract filename from Content-Disposition header
 */
const getFileNameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?["']?([^;"']+)["']?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * GET /results/:electionId
 */
export const getResults = async (electionId) => {
  if (!electionId) throw new Error("electionId is required");
  try {
    const res = await api.get(`/results/${electionId}`);
    return res;
  } catch (err) {
    const msg = err?.message || (err?.data && err.data.message) || "Failed to fetch results";
    throw new Error(msg);
  }
};

/**
 * GET /results/:electionId/winner
 */
export const getWinner = async (electionId) => {
  if (!electionId) throw new Error("electionId is required");
  try {
    const res = await api.get(`/results/${electionId}/winner`);
    return res;
  } catch (err) {
    const msg = err?.message || (err?.data && err.data.message) || "Failed to fetch winner";
    throw new Error(msg);
  }
};

/**
 * POST /results/:electionId/declare
 */
export const declareResults = async (electionId) => {
  if (!electionId) throw new Error("electionId is required");
  try {
    const res = await api.post(`/results/${electionId}/declare`);
    return res;
  } catch (err) {
    const msg = err?.message || (err?.data && err.data.message) || "Failed to declare results";
    throw new Error(msg);
  }
};

/**
 * GET /results/:electionId/analytics
 */
export const getAnalytics = async (electionId) => {
  if (!electionId) throw new Error("electionId is required");
  try {
    const res = await api.get(`/results/${electionId}/analytics`);
    return res;
  } catch (err) {
    const msg = err?.message || (err?.data && err.data.message) || "Failed to fetch analytics";
    throw new Error(msg);
  }
};

/**
 * GET /results/:electionId/export?format=pdf|excel|csv
 * If format implies a file (pdf/excel/csv) this returns { blob, filename, mimeType }
 * Otherwise returns server response.
 */
export const exportResults = async (electionId, format = "csv") => {
  if (!electionId) throw new Error("electionId is required");
  try {
    const params = format ? { format } : {};
    // For file formats request blob
    const isFile = ["pdf", "excel", "csv"].includes(String(format).toLowerCase());
    const res = await api.get(`/results/${electionId}/export`, {
      params,
      responseType: isFile ? "blob" : "json"
    });

    if (isFile) {
      // axios returns the response directly via interceptor as data; here data is Blob
      const blob = res;
      // attempt to read filename from headers (api interceptor returns data only, so fetch raw via a direct axios call if needed)
      // Try calling axios directly to access headers when necessary
      // Fallback: derive a filename
      let filename = `results_${electionId}.${format === "excel" ? "xlsx" : format === "pdf" ? "pdf" : "csv"}`;
      // If api instance preserved headers (some setups), try to read them
      try {
        // perform a raw request to capture headers (small overhead)
        const raw = await api.request({
          url: `/results/${electionId}/export`,
          method: "GET",
          params,
          responseType: "blob",
          // prevent interceptors that map response.data
          transformResponse: (d) => d
        });
        const disposition = raw.headers?.["content-disposition"] || raw.headers?.["Content-Disposition"];
        const maybe = getFileNameFromDisposition(disposition);
        if (maybe) filename = maybe;
        const mime = raw.headers?.["content-type"] || raw.headers?.["Content-Type"] || (format === "pdf" ? "application/pdf" : format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv");
        return { blob: raw.data, filename, mimeType: mime };
      } catch (e) {
        // fallback: return blob from initial call
        const mime = blob.type || (format === "pdf" ? "application/pdf" : format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv");
        return { blob, filename, mimeType: mime };
      }
    }

    return res;
  } catch (err) {
    const msg = err?.message || (err?.data && err.data.message) || "Failed to export results";
    throw new Error(msg);
  }
};

export default {
  getResults,
  getWinner,
  declareResults,
  getAnalytics,
  exportResults
};
