import { useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchElectionById,
    selectCurrentElection,
    selectElectionLoading
} from "../redux/slices/electionSlice.js";
import {
    fetchCandidates,
    selectAllCandidates
} from "../redux/slices/candidateSlice.js";
import useAuth from "./useAuth.js";
import { isElectionActive, getElectionStatus, calculateTimeRemaining } from "../utils/helpers.js";

/**
 * useElection(electionId, opts = { autoRefreshIntervalMs: 0 })
 * - electionId: optional id (numeric or contract address)
 * - autoRefreshIntervalMs: 0 (disabled) or milliseconds
 */
export default function useElection(electionId, opts = {}) {
    const { autoRefreshIntervalMs = 0 } = opts;
    const dispatch = useDispatch();
    const election = useSelector(selectCurrentElection);
    const allCandidates = useSelector(selectAllCandidates);
    const loading = useSelector(selectElectionLoading);

    const { user, isAuthenticated, isManager, isAuthority, isSuperAdmin, isVoter } = useAuth();
    const timerRef = useRef(null);

    const load = useCallback(async () => {
        if (!electionId) return;
        try {
            await dispatch(fetchElectionById(electionId)).unwrap();
        } catch (e) {
            // swallow — callers read error via return value below if needed
        }
        try {
            await dispatch(fetchCandidates({ electionId })).unwrap();
        } catch (e) {
            // ignore
        }
    }, [dispatch, electionId]);

    // initial fetch when electionId changes
    useEffect(() => {
        if (!electionId) return;
        load();
        // setup auto-refresh if requested
        if (autoRefreshIntervalMs > 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                load();
            }, autoRefreshIntervalMs);
            return () => clearInterval(timerRef.current);
        }
        return undefined;
    }, [electionId, load, autoRefreshIntervalMs]);

    const refresh = useCallback(() => {
        return load();
    }, [load]);

    // candidates filtered for this election (local DB objects may include electionId)
    const candidates = useMemo(() => {
        if (!electionId) return [];
        // candidates may have electionId or electionAddress property
        return (allCandidates || []).filter((c) => {
            if (!c) return false;
            if (/^0x/i.test(String(electionId))) {
                return String((c.electionAddress || "").toLowerCase()) === String(electionId).toLowerCase();
            }
            return String(c.electionId ?? c.electionId ?? "") === String(electionId);
        });
    }, [allCandidates, electionId]);

    // computed flags
    const currentStatus = useMemo(() => {
        if (!election) return null;
        return getElectionStatus(election);
    }, [election]);

    const timeRemaining = useMemo(() => {
        if (!election) return "";
        // prefer endTime field; support seconds or ms
        const end = election.endTime ?? election.endTimestamp ?? election.end;
        return calculateTimeRemaining(end);
    }, [election]);

    const canManage = useMemo(() => {
        // allow if user has manager / super-admin / authority roles
        return Boolean(isSuperAdmin || isManager || isAuthority);
    }, [isSuperAdmin, isManager, isAuthority]);

    const canVote = useMemo(() => {
        if (!election) return false;
        // require election active and user has VOTER role
        const active = isElectionActive(election);
        return active && Boolean(isVoter);
    }, [election, isVoter]);

    const isLoading = Boolean(loading);

    const error = null; // reducers surface errors via slices; keep null here (components can use slice selectors if needed)

    return {
        election,
        candidates,
        isLoading,
        error,
        refresh,
        canVote,
        canManage,
        timeRemaining,
        currentStatus
    };
}
