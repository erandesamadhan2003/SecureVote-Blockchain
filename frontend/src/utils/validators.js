const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z\s'-]{2,100}$/; // letters, spaces, apostrophe, hyphen

export const isValidAddress = (address) => {
	if (!address || typeof address !== "string") return false;
	return ETH_ADDRESS_REGEX.test(address.trim());
};

export const isValidEmail = (email) => {
	if (!email || typeof email !== "string") return false;
	return EMAIL_REGEX.test(email.trim());
};

export const isValidName = (name) => {
	if (!name || typeof name !== "string") return false;
	return NAME_REGEX.test(name.trim());
};

export const isValidDate = (date) => {
	// Accept Date object, numeric timestamp (s or ms) or ISO/string
	if (!date) return false;
	if (date instanceof Date) return !Number.isNaN(date.getTime());
	const n = Number(date);
	if (!Number.isNaN(n)) {
		// if looks like seconds convert to ms
		const ms = n > 1e12 ? n : n * 1000;
		return !Number.isNaN(ms) && ms > 0;
	}
	// try parsing string
	const parsed = Date.parse(String(date));
	return !Number.isNaN(parsed);
};

const toMs = (d) => {
	if (d instanceof Date) return d.getTime();
	const n = Number(d);
	if (!Number.isNaN(n)) return n > 1e12 ? n : n * 1000;
	const parsed = Date.parse(String(d));
	return Number.isNaN(parsed) ? null : parsed;
};

export const isDateInFuture = (date) => {
	const ms = toMs(date);
	if (!ms) return false;
	return ms > Date.now();
};

export const isEndDateAfterStart = (start, end) => {
	const s = toMs(start);
	const e = toMs(end);
	if (s == null || e == null) return false;
	return e > s;
};

export default {
	isValidAddress,
	isValidEmail,
	isValidName,
	isValidDate,
	isDateInFuture,
	isEndDateAfterStart
};
