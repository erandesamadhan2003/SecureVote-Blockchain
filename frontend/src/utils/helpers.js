const toMs = (ts) => {
	// accept Date, number (s or ms) or numeric string
	if (ts == null) return null;
	if (ts instanceof Date) return ts.getTime();
	const n = Number(ts);
	if (Number.isNaN(n)) return null;
	// if timestamp looks like seconds (<= 1e12) convert to ms
	return n > 1e12 ? n : n * 1000;
};

export const truncateAddress = (address) => {
	if (!address || typeof address !== "string") return "";
	const a = address.trim();
	if (a.length <= 10) return a;
	return `${a.slice(0, 6)}...${a.slice(-4)}`;
};

export const formatDate = (timestamp, locale = "en-US", opts = {}) => {
	const ms = toMs(timestamp);
	if (!ms) return "";
	return new Date(ms).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", ...opts });
};

export const formatTime = (timestamp, locale = "en-US", opts = {}) => {
	const ms = toMs(timestamp);
	if (!ms) return "";
	return new Date(ms).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", ...opts });
};

export const calculateTimeRemaining = (endTime) => {
	const ms = toMs(endTime);
	if (!ms) return "";
	const diff = ms - Date.now();
	if (diff <= 0) return "Ended";
	const days = Math.floor(diff / (24 * 60 * 60 * 1000));
	const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
	const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
	const parts = [];
	if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
	if (hours) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
	if (!days && minutes) parts.push(`${minutes} min${minutes > 1 ? "s" : ""}`);
	return parts.length ? `${parts.join(" ")} left` : "Less than a minute left";
};

export const formatNumber = (num) => {
	if (num == null) return "0";
	if (typeof num === "string" && num.match(/^\d+$/)) num = Number(num);
	if (typeof num !== "number") return String(num);
	return num.toLocaleString();
};

export const calculatePercentage = (votes, total, decimals = 2) => {
	const v = Number(votes) || 0;
	const t = Number(total) || 0;
	if (t === 0) return `0%`;
	const p = (v / t) * 100;
	return `${p.toFixed(decimals)}%`;
};

export const isElectionActive = (election) => {
	if (!election) return false;
	const start = toMs(election.startTime);
	const end = toMs(election.endTime);
	const now = Date.now();
	// require isActive flag if present
	if (election.isActive === false) return false;
	if (!start || !end) return false;
	return now >= start && now <= end;
};

export const getElectionStatus = (election) => {
	// Prefer explicit status if provided (string)
	if (!election) return "Unknown";
	if (typeof election.status === "string" && election.status) return election.status;

	// normalize times
	const start = toMs(election.startTime);
	const end = toMs(election.endTime);
	const regDeadline = toMs(election.registrationDeadline);
	const now = Date.now();

	// inactive/cancelled
	if (election.isActive === false) return "Cancelled";

	// result declared (explicit flag may not exist; check status field earlier)
	// fallback checks
	if (end && now > end) {
		// if there's a result flag or getWinner info elsewhere, you can refine to ResultDeclared
		return "Ended";
	}

	if (start && now >= start && end && now <= end) return "Voting";

	// registration window (if deadline set)
	if (regDeadline && now <= regDeadline) return "Registration";

	// before start (created)
	if (start && now < start) return "Created";

	return "Unknown";
};

export default {
	truncateAddress,
	formatDate,
	formatTime,
	calculateTimeRemaining,
	formatNumber,
	calculatePercentage,
	isElectionActive,
	getElectionStatus
};
