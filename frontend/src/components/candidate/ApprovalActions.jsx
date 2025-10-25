import React, { useState } from "react";
import Button from "../common/Button.jsx";
import Modal from "../common/Modal.jsx";
import useToast from "../../hooks/useToast.js";

/**
 * Props:
 * - candidateId: string|number
 * - candidateName: string
 * - onApprove: async function(candidateId) => Promise
 * - onReject: async function(candidateId) => Promise
 */
export default function ApprovalActions({ candidateId, candidateName = "", onApprove = async () => {}, onReject = async () => {} }) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirm, setConfirm] = useState({ action: null, open: false });
  const { showSuccess, showError } = useToast();

  const openConfirm = (action) => setConfirm({ action, open: true });
  const closeConfirm = () => setConfirm({ action: null, open: false });

  const handleConfirm = async () => {
    if (!confirm.action) return;
    const id = candidateId;
    if (confirm.action === "approve") {
      setIsApproving(true);
      try {
        await onApprove(id);
        showSuccess("Candidate approved");
      } catch (e) {
        showError(e?.message || "Approve failed");
      } finally {
        setIsApproving(false);
        closeConfirm();
      }
    } else if (confirm.action === "reject") {
      setIsRejecting(true);
      try {
        await onReject(id);
        showSuccess("Candidate rejected");
      } catch (e) {
        showError(e?.message || "Reject failed");
      } finally {
        setIsRejecting(false);
        closeConfirm();
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="small" onClick={() => openConfirm("approve")} disabled={isApproving || isRejecting}>
          {isApproving ? "Approving..." : "Approve"}
        </Button>
        <Button variant="danger" size="small" onClick={() => openConfirm("reject")} disabled={isApproving || isRejecting}>
          {isRejecting ? "Rejecting..." : "Reject"}
        </Button>
      </div>

      <Modal isOpen={confirm.open} onClose={closeConfirm} title={confirm.action === "approve" ? "Confirm Approve" : "Confirm Reject"} size="small" showCloseButton>
        <div className="space-y-4">
          <div className="text-sm">
            {confirm.action === "approve" ? (
              <>Are you sure you want to APPROVE <strong>{candidateName}</strong> (ID: {candidateId})?</>
            ) : (
              <>Are you sure you want to REJECT <strong>{candidateName}</strong> (ID: {candidateId})? This action can be recorded on-chain.</>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="small" onClick={closeConfirm} disabled={isApproving || isRejecting}>Cancel</Button>
            <Button variant={confirm.action === "approve" ? "primary" : "danger"} size="small" onClick={handleConfirm} loading={isApproving || isRejecting}>
              {confirm.action === "approve" ? "Confirm Approve" : "Confirm Reject"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
