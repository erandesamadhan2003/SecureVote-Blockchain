import React, { useState, useMemo } from "react";
import CandidateCard from "../candidate/CandidateCard.jsx";
import VoteConfirmation from "./VoteConfirmation.jsx";
import Button from "../common/Button.jsx";

/**
 * Props:
 * - election: object
 * - candidates: array
 * - hasVoted: boolean
 * - onVote(candidate) => Promise resolves with tx/result
 * - onViewResults()
 */
export default function VotingBallot({ election = {}, candidates = [], hasVoted = false, isVoterRegistered = true, onVote = async () => {}, onViewResults = () => {} }) {
    const [selected, setSelected] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const sorted = useMemo(() => {
        const arr = Array.isArray(candidates) ? [...candidates] : [];
        // prefer approved first, then by candidateId
        arr.sort((a, b) => {
            const sa = (a.status || "").toLowerCase();
            const sb = (b.status || "").toLowerCase();
            if (sa !== sb) {
                if (sa === "approved") return -1;
                if (sb === "approved") return 1;
            }
            return (Number(a.candidateId ?? a.id ?? 0) - Number(b.candidateId ?? b.id ?? 0));
        });
        return arr;
    }, [candidates]);

    const handleSelect = (c) => {
        setSelected(c);
        setError(null);
    };

    const handleConfirm = async (candidate, setSubmittingLocal) => {
        setError(null);
        setSubmitting(true);
        setSubmittingLocal(true);
        try {
            const res = await onVote(candidate);
            // parent handles post-vote navigation/state
            setConfirmOpen(false);
            return res;
        } catch (err) {
            setError(err?.message || "Vote failed");
            throw err;
        } finally {
            setSubmitting(false);
            setSubmittingLocal(false);
        }
    };

    if (hasVoted) {
        return (
            <div className="p-6 bg-white rounded shadow text-center">
                <h3 className="text-lg font-medium">You have already voted</h3>
                <div className="mt-3">
                    <Button variant="outline" size="small" onClick={onViewResults}>View Results</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sorted.map((c) => (
                    <CandidateCard
                        key={c.candidateId ?? c._id ?? c.id}
                        candidate={c}
                        mode="vote"
                        isSelected={selected && String(selected.candidateId ?? selected._id ?? selected.id) === String(c.candidateId ?? c._id ?? c.id)}
                        onSelect={() => handleSelect(c)}
                    />
                ))}
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm text-red-600">{error}</div>
                <div>
                    <Button variant="outline" size="small" onClick={() => setSelected(null)}>Clear</Button>
                    <Button
                        variant="primary"
                        size="medium"
                        onClick={() => setConfirmOpen(true)}
                        disabled={!selected || !isVoterRegistered}
                        title={!isVoterRegistered ? "Your wallet is not registered to vote for this election" : undefined}
                        className="ml-2"
                    >
                        Vote
                    </Button>
                </div>
            </div>

            <VoteConfirmation
                isOpen={confirmOpen}
                candidate={selected}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    );
}