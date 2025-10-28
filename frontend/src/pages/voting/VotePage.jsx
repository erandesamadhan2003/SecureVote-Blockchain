import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import VotingBallot from "../../components/voting/VotingBallot.jsx";
import VoteSuccess from "../../components/voting/VoteSuccess.jsx";
import electionService from "../../services/electionService.js";
import candidateService from "../../services/candidateService.js";
import voteService from "../../services/voteService.js";
import { submitVote, checkHasVoted } from "../../redux/slices/voteSlice.js";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import { formatDate, calculateTimeRemaining, getElectionStatus } from "../../utils/helpers.js";
import Button from "../../components/common/Button.jsx";

/*
  Route: /vote/:electionId
*/
export default function VotePage() {
    const { electionId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, walletAddress, isAuthenticated, isVoter } = useAuth();
    const { showError, showSuccess } = useToast();

    const [election, setElection] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasVoted, setHasVoted] = useState(false);
    const [transaction, setTransaction] = useState(null);
    const [isVoting, setIsVoting] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [checkingRegistration, setCheckingRegistration] = useState(true);
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setIsLoading(true);
            try {
                const res = await electionService.getElectionById(electionId);
                if (!mounted) return;
                const e = res?.election ?? res;
                setElection(e || null);
            } catch (err) {
                showError("Failed to load election");
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [electionId, showError]);

    // Load candidates on mount (and when electionId changes)
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const res = await candidateService.getCandidatesByElection(electionId).catch(() => null);
                const list = res?.candidates ?? (Array.isArray(res) ? res : (res?.candidates ?? []));
                if (!mounted) return;
                setCandidates(Array.isArray(list) ? list : []);
            } catch (err) {
                console.error("Failed to load candidates for voting:", err);
                setCandidates([]);
            }
        };
        load();
        return () => { mounted = false; };
    }, [electionId]);

    useEffect(() => {
        let mounted = true;
        const check = async () => {
            try {
                // try to check using authenticated user wallet or query string
                const addr = walletAddress || user?.walletAddress;
                if (!addr) {
                    setHasVoted(false);
                    setIsRegistered(false);
                    return;
                }
                const res = await voteService.checkVotingStatus(electionId, addr).catch(() => null);
                if (!mounted) return;
                const voted = res?.hasVoted ?? (res?.hasVoted === false ? false : false);
                setHasVoted(!!voted);
                // optionally capture tx info if backend returns it
                if (res?.tx) setTransaction(res.tx);

                // check registration status separately (getVoterInfo)
                try {
                    setCheckingRegistration(true);
                    const infoRes = await voteService.getVoterInfo(electionId, addr).catch(() => null);
                    const info = infoRes?.voterInfo ?? infoRes ?? null;
                    if (!mounted) return;
                    const registered = !!(info?.isRegistered || info?.isRegistered === true);
                    setIsRegistered(registered);
                } catch (e) {
                    setIsRegistered(false);
                } finally {
                    setCheckingRegistration(false);
                }
            } catch (err) {
                // ignore
            }
        };
        check();
        return () => { mounted = false; };
    }, [electionId, walletAddress, user]);

    const handleRegisterMe = async () => {
        if (!walletAddress && !user?.walletAddress) {
            showError("Connect your wallet first");
            return;
        }
        const addr = walletAddress || user?.walletAddress;
        setRegistering(true);
        try {
            await voteService.registerVoter(electionId, addr);
            showSuccess("Wallet registered for voting");
            setIsRegistered(true);
        } catch (err) {
            const msg = String(err?.message || err);
            // if backend indicates role must be granted, provide actionable guidance
            if (msg.toLowerCase().includes("must have voter role") || msg.toLowerCase().includes("voter role")) {
                showError("Registration failed: address lacks VOTER role. Ask an authority or manager to grant the VOTER role (Admin -> Roles) before registering.");
            } else {
                showError(msg || "Registration failed");
            }
            // ensure UI knows registration did not succeed; do NOT rethrow to avoid unhandled promise
            setIsRegistered(false);
        } finally {
            setRegistering(false);
        }
    };

    const onVote = async (candidate) => {
        setIsVoting(true);
        try {
            const candidateId = candidate?.candidateId ?? candidate?.id ?? candidate?._id;
            // Attempt client-side via voteService which prefers wallet, falls back to server.
            const res = await voteService.castVote(electionId, candidateId);
            // normalize response
            const txHash = res?.txHash || res?.hash || res?.tx?.txHash || res?.tx?.hash || (res && res.transactionHash) || null;
            setHasVoted(true);
            setTransaction(res || { txHash });
            showSuccess("Vote submitted");
            return res;
        } catch (err) {
            showError(err?.message || "Vote submission failed");
            throw err;
        } finally {
            setIsVoting(false);
        }
    };

    const canVote = useMemo(() => {
        // basic guard: user must be voter role and election must exist and be in Voting status
        if (!election) return false;
        const status = election.status || getElectionStatus(election);
        // require on-chain registration as an extra guard
        return isVoter && String(status).toLowerCase() === "voting" && !!isRegistered;
    }, [election, isVoter, isRegistered]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">{election?.name ?? "Election"}</h1>
                    <div className="text-sm text-gray-600">
                        {election?.endTime ? `Ends: ${formatDate(election.endTime)} — ${calculateTimeRemaining(election.endTime)}` : ""}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="small" onClick={() => navigate(-1)}>Back</Button>
                </div>
            </div>

            {!isAuthenticated ? (
                <div className="p-6 bg-white rounded shadow text-center text-sm text-gray-700">Please connect your wallet to vote.</div>
            ) : isLoading ? (
                <div className="p-6 bg-white rounded shadow text-center text-sm text-gray-700">Loading election…</div>
            ) : hasVoted ? (
                <VoteSuccess transaction={transaction || {}} electionName={election?.name} electionEndTime={election?.endTime} onBack={() => navigate("/elections")} onViewResults={() => navigate(`/elections/${electionId}/results`)} />
            ) : !canVote ? (
                <>
                    {!checkingRegistration && !isRegistered ? (
                        <div className="p-6 bg-yellow-50 rounded shadow text-center text-sm text-gray-700 space-y-3">
                            <div>Your wallet is not registered to vote in this election.</div>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="primary" size="medium" onClick={handleRegisterMe} loading={registering}>Register to Vote</Button>
                                <Button variant="outline" size="small" onClick={() => navigate(-1)}>Back</Button>
                            </div>
                            <div className="text-xs text-gray-500">If registration fails, contact election authority or try again later.</div>
                        </div>
                    ) : (
                        <div className="p-6 bg-yellow-50 rounded shadow text-center text-sm text-gray-700">
                            Voting is not active or you do not have VOTER role.
                        </div>
                    )}
                </>
             ) : (
                <div>
                    <div className="mb-4 text-sm text-red-600 font-medium">Warning: Your vote is final and anonymous. Proceed carefully.</div>
                    <VotingBallot
                        election={election}
                        candidates={candidates}
                        hasVoted={hasVoted}
                        isVoterRegistered={isRegistered}
                        onVote={onVote}
                        onViewResults={() => navigate(`/elections/${electionId}/results`)}
                    />
                </div>
            )}
        </div>
    );
}
