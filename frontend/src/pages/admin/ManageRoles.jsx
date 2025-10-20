import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../../hooks/useElection';
import { useCandidates } from '../../hooks/useCandidates';
import { useUI } from '../../hooks/useUI';
import { useWallet } from '../../hooks/useWallet';

/**
 * Admin - Manage Roles / Validate Candidates
 * Route: /admin/manage-roles
 *
 * - Access: ElectionAuthority OR ElectionManager
 * - Shows election selector, pending candidates list
 * - Approve / Reject calls validateCandidate and shows transaction modal / notifications
 */

const ManageRoles = () => {
  const navigate = useNavigate();
  const { account } = useWallet();

  const {
    elections = [],
    loadElections,
    currentElection,
    loadElectionDetail,
    isElectionManager,
    isElectionAuthority
  } = useElection();

  const [selectedElectionId, setSelectedElectionId] = useState(null);

  // Provide electionId to hook so it can default where appropriate
  const {
    pendingCandidates = [],
    loadCandidates,
    validateCandidate,
  } = useCandidates(selectedElectionId);

  const { showError, showSuccess, showTransactionModal, hideTransactionModal, showConfirmationModal } = useUI();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({}); // { [candidateId]: 'approve'|'reject'|false }

  // Access guard
  const allowed = isElectionManager === true || isElectionAuthority === true;

  // Load elections on mount
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        await loadElections();
      } catch (err) {
        showError?.('Failed to load elections', err?.message || '');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [loadElections, showError]);

  // Default select first election when elections load
  useEffect(() => {
    if (!elections || elections.length === 0) return;
    const pick = elections[0].electionId ?? elections[0]._id;
    setSelectedElectionId(prev => prev ?? pick);
  }, [elections]);

  // Load election detail and pending candidates when selection changes
  useEffect(() => {
    if (!selectedElectionId) return;
    let mounted = true;
    const loadAll = async () => {
      try {
        setLoading(true);
        // choose whether to use electionId or _id depending on app data
        await loadElectionDetail(selectedElectionId);
        // load only pending candidates
        await loadCandidates(selectedElectionId, 'Pending');
      } catch (err) {
        showError?.('Failed to load candidates', err?.message || '');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAll();
    return () => { mounted = false; };
  }, [selectedElectionId, loadElectionDetail, loadCandidates, showError]);

  const onApproveReject = async (candidate, approve) => {
    if (!candidate) return;
    const cId = candidate.candidateId ?? candidate._id;
    const label = approve ? 'Approve' : 'Reject';

    // optional confirmation
    const confirmed = await new Promise(resolve => {
      if (showConfirmationModal) {
        showConfirmationModal({
          title: `${label} Candidate`,
          description: `Are you sure you want to ${label.toLowerCase()} ${candidate.name || candidate.candidateAddress}?`,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      } else {
        // no confirmation modal available -> proceed
        resolve(true);
      }
    });

    if (!confirmed) return;

    try {
      setProcessing(prev => ({ ...prev, [cId]: approve ? 'approve' : 'reject' }));
      showTransactionModal?.({
        title: `${label} Candidate`,
        description: `Please confirm the transaction in your wallet to ${label.toLowerCase()} the candidate.`,
        loading: true,
      });

      // call validateCandidate(candidateId, approved, electionAddress)
      const electionAddress = currentElection?.contractAddress ?? null;
      await validateCandidate(cId, approve, electionAddress);

      hideTransactionModal?.();
      showSuccess?.(`${label}ed`, `${candidate.name || candidate.candidateAddress} has been ${label.toLowerCase()}ed.`);

      // remove from pendingCandidates list by reloading
      await loadCandidates(selectedElectionId, 'Pending');
    } catch (err) {
      hideTransactionModal?.();
      showError?.(`${label} Failed`, (err && err.message) ? err.message : `Failed to ${label.toLowerCase()} candidate`);
    } finally {
      setProcessing(prev => ({ ...prev, [cId]: false }));
    }
  };

  const electionOptions = useMemo(() => (elections || []).map(e => ({
    id: e.electionId ?? e._id,
    name: e.name,
    status: e.status
  })), [elections]);

  if (allowed === false) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="text-lg font-semibold">Access denied</h3>
          <p className="text-sm text-gray-600 mt-2">You need Election Authority or Election Manager privileges to manage candidates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Manage Candidates / Roles</h2>
        <div className="text-sm text-gray-600">Connected: <span className="font-mono">{account ?? 'Not connected'}</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border shadow-sm p-4">
          <label className="text-sm font-medium">Select Election</label>
          <select
            value={selectedElectionId ?? ''}
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="mt-2 block w-full rounded-md border-gray-200 p-2"
          >
            {(electionOptions.length === 0) && <option value="">No elections</option>}
            {electionOptions.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.name} — {opt.status}
              </option>
            ))}
          </select>

          <div className="mt-4 text-sm text-gray-500">
            Only pending candidates are shown. Approve to allow them to stand in the election.
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3">Pending Candidates</h3>

            {loading && <div className="text-sm text-gray-500">Loading...</div>}

            {(!loading && (!pendingCandidates || pendingCandidates.length === 0)) && (
              <div className="text-sm text-gray-500">No pending candidates for this election.</div>
            )}

            <div className="space-y-4">
              {(pendingCandidates || []).map(candidate => {
                const cId = candidate.candidateId ?? candidate._id;
                const isProcessing = !!processing[cId];
                return (
                  <div key={cId} className="flex items-start gap-4 border-b last:border-b-0 pb-4">
                    <div className="w-20 h-20 bg-gray-50 rounded overflow-hidden flex-shrink-0">
                      {candidate.imageUrl ? (
                        // imageUrl may be a Pinata/IPFS gateway link
                        <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" />
                      ) : candidate.imageHash ? (
                        <img src={`https://gateway.pinata.cloud/ipfs/${candidate.imageHash}`} alt={candidate.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{candidate.name || candidate.candidateAddress}</div>
                          <div className="text-xs text-gray-500">{candidate.party || 'Independent'} • <span className="font-mono">{candidate.candidateAddress}</span></div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onApproveReject(candidate, true)}
                            disabled={isProcessing}
                            className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {isProcessing === 'approve' ? 'Approving...' : 'Approve'}
                          </button>

                          <button
                            onClick={() => onApproveReject(candidate, false)}
                            disabled={isProcessing}
                            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {isProcessing === 'reject' ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      </div>

                      {candidate.manifesto && (
                        <div className="mt-2 text-sm text-gray-700">
                          <div className="font-medium text-xs text-gray-500">Manifesto</div>
                          <div className="text-sm mt-1 whitespace-pre-line">{candidate.manifesto}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageRoles;