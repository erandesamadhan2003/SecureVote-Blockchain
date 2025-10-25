import React, { useMemo, useState } from "react";
import CandidateCard from "../candidate/CandidateCard.jsx";
import Button from "../common/Button.jsx";
import VoteConfirmation from "./VoteConfirmation.jsx";
import VoteSuccess from "./VoteSuccess.jsx";

/**
 * Props:
 * - election: object
 * - candidates: array
 * - hasVoted: boolean
 * - voteReceipt: object | null (optional)
 * - onVote: async (candidate) => { txReceipt }
 * - onViewResults: () => void
 */
export default function VotingBallot({ election, candidates = [], hasVoted = false, voteReceipt = null, onVote, onViewResults }) {
    const [selectedId, setSelectedId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [successData, setSuccessData] = useState(voteReceipt || null);

    const selectedCandidate = useMemo(() => candidates.find(c => String(c.candidateId ?? c.id ?? c._id) === String(selectedId)), [candidates, selectedId]);

    const clearSelection = () => setSelectedId(null);

    const handleCast = () => {
        if (!selectedId) return;
        setConfirmOpen(true);
    };

    const handleConfirm = async (candidate, setSubmitting) => {
        try {
            const res = await onVote(candidate);
            setSuccessData(res);
            setConfirmOpen(false);
        } catch (err) {
            // bubble up or let modal show error
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    // Already voted state: show message or success card if receipt available
    if (hasVoted || successData) {
        return (
            <div className="space-y-6">
                {successData ? (
                    <VoteSuccess
                        transaction={successData}
                        electionName={election?.name}
                        electionEndTime={election?.endTime}
                        onViewResults={onViewResults}
                    />
                ) : (
                    <div className="bg-yellow-50 p-6 rounded shadow text-center">
                        <h3 className="text-lg font-semibold">You have already voted in this election</h3>
                        <p className="text-sm text-gray-700 mt-2">Your vote is final and cannot be changed.</p>
                        <div className="mt-4">
                            <Button variant="outline" size="medium" onClick={onViewResults}>View Results</Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded shadow flex items-start gap-4">
                <div className="flex-shrink-0">
                    <svg className="w-10 h-10 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1v22M1 12h22" strokeWidth="1.5" /></svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Cast Your Vote</h2>
                    <p className="text-sm text-gray-600 mt-1">Your vote is final and cannot be changed. Please review candidate details before confirming.</p>
                </div>
            </div>

            <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {candidates.map((c) => {
                        const id = c.candidateId ?? c.id ?? c._id;
                        const isSelected = String(id) === String(selectedId);
                        return (
                            <div key={id} className={`${isSelected ? "ring-2 ring-blue-300 bg-blue-50" : ""} rounded`}>
                                <CandidateCard
                                    candidate={c}
                                    mode="vote"
                                    isSelected={isSelected}
                                    onSelect={() => setSelectedId(id)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <Button variant="outline" size="medium" onClick={clearSelection} disabled={!selectedId}>Clear selection</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600">
                        Selected: {selectedCandidate ? selectedCandidate.name : "None"}
                    </div>
                    <Button variant="primary" size="large" onClick={handleCast} disabled={!selectedId}>Cast Vote</Button>
                </div>
            </div>

            <VoteConfirmation
                isOpen={confirmOpen}
                candidate={selectedCandidate}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    );
}
