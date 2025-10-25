import React, { useState } from "react";
import Modal from "../common/Modal.jsx";
import Button from "../common/Button.jsx";

/**
 * Props:
 * - isOpen
 * - candidate
 * - onConfirm: async (candidate, setSubmitting) => result
 * - onCancel
 */
export default function VoteConfirmation({ isOpen, candidate, onConfirm, onCancel }) {
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleConfirm = async () => {
        if (!confirmed || !candidate) return;
        setError(null);
        setSubmitting(true);
        try {
            await onConfirm(candidate, (val) => setSubmitting(val));
        } catch (err) {
            setError(err?.message || "Transaction failed");
            setSubmitting(false);
            return;
        }
        // parent will close modal on success
    };

    return (
        <Modal isOpen={isOpen} onClose={() => { if (!submitting) onCancel && onCancel(); }} title="Confirm Your Vote" size="small" showCloseButton={!submitting}>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        {candidate?.imageHash ? <img src={`https://ipfs.io/ipfs/${candidate.imageHash}`} alt="candidate" className="object-cover w-full h-full" /> : <div className="text-gray-400">No image</div>}
                    </div>
                    <div>
                        <div className="text-lg font-semibold">{candidate?.name}</div>
                        <div className="text-sm text-gray-600">{candidate?.party}</div>
                    </div>
                </div>

                <div className="text-sm text-red-700">
                    <strong>Warning:</strong> This action cannot be undone. Your vote is final and anonymous. Transaction will be recorded on the blockchain.
                </div>

                <div className="flex items-center gap-2">
                    <input type="checkbox" id="confirmVote" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={submitting} />
                    <label htmlFor="confirmVote" className="text-sm">I understand and confirm my vote</label>
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}

                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" size="small" onClick={() => { if (!submitting) onCancel && onCancel(); }} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" size="medium" onClick={handleConfirm} disabled={!confirmed || submitting} loading={submitting}>Confirm Vote</Button>
                </div>
            </div>
        </Modal>
    );
}
