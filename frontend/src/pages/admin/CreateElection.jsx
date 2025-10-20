import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Pie } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import Confetti from 'react-confetti';
import { useElection } from '../../hooks/useElection';
import { useUI } from '../../hooks/useUI';
import { useWallet } from '../../hooks/useWallet';

/**
 * Admin Create Election (Results / Summary) page
 *
 * Notes:
 * - Shows election summary, bar & pie charts, detailed results table,
 *   winner announcement with confetti and a simple transaction log area.
 * - Uses useElection hook for elections + candidates data.
 */

const CreateElection = () => {
  const { account } = useWallet();
  const {
    elections = [],
    loadElections,
    currentElection,
    loadElectionDetail,
    candidates = []
  } = useElection();

  const { showError } = useUI();

  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [confettiRun, setConfettiRun] = useState(false);

  // Load elections on mount
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        await loadElections();
      } catch (err) {
        showError?.('Failed to load elections');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [loadElections, showError]);

  // When elections load, default to the first ended/declared election (if any)
  useEffect(() => {
    if (!elections || elections.length === 0) return;
    const ended = elections.find(e => e.status === 'Ended' || e.status === 'ResultDeclared');
    const pick = ended ? (ended.electionId ?? ended._id) : (elections[0].electionId ?? elections[0]._id);
    setSelectedElectionId(pick);
  }, [elections]);

  // Load selected election detail + transactions
  useEffect(() => {
    if (!selectedElectionId) return;
    let mounted = true;
    const loadAll = async () => {
      setLoading(true);
      try {
        await loadElectionDetail(selectedElectionId);

        // try fetching transactions (optional endpoint - adjust if needed)
        try {
          const idForApi = (currentElection?.electionId ?? selectedElectionId);
          const res = await fetch(`/api/elections/${idForApi}/transactions`);
          if (res.ok) {
            const data = await res.json();
            if (mounted) setTransactions(Array.isArray(data) ? data : []);
          } else {
            if (mounted) setTransactions([]);
          }
        } catch (txErr) {
          if (mounted) setTransactions([]);
        }
      } catch (err) {
        showError?.('Failed to load election details');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAll();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElectionId, loadElectionDetail, showError]);

  // Guard: derive selectedElection from available sources
  const selectedElection = useMemo(() => {
    if (!selectedElectionId) return null;
    return elections.find(e => (e.electionId ?? e._id) == selectedElectionId) || currentElection || null;
  }, [selectedElectionId, elections, currentElection]);

  // Prepare chart & table data from candidates
  const totalVotes = useMemo(() => {
    if (!candidates || candidates.length === 0) return 0;
    return candidates.reduce((s, c) => s + (c.voteCount || 0), 0);
  }, [candidates]);

  const sortedCandidates = useMemo(() => {
    return [...(candidates || [])].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  }, [candidates]);

  // Helpers
  function getCandidateColor(index) {
    const palette = [
      '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4',
      '#A78BFA', '#F97316', '#34D399', '#F43F5E', '#60A5FA'
    ];
    return palette[index % palette.length];
  }

  function percentage(v) {
    if (!totalVotes || totalVotes === 0) return '0%';
    return `${((v / totalVotes) * 100).toFixed(1)}%`;
  }

  const barData = useMemo(() => {
    const labels = sortedCandidates.map(c => c.name || (c.candidateAddress?.slice(0,6) ?? ''));
    const data = sortedCandidates.map(c => c.voteCount || 0);
    return {
      labels,
      datasets: [
        {
          label: 'Votes',
          data,
          backgroundColor: sortedCandidates.map((_, i) => getCandidateColor(i)),
        }
      ]
    };
  }, [sortedCandidates]);

  const pieData = useMemo(() => {
    const labels = sortedCandidates.map(c => c.name || (c.candidateAddress?.slice(0,6) ?? ''));
    const data = sortedCandidates.map(c => c.voteCount || 0);
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: sortedCandidates.map((_, i) => getCandidateColor(i)),
          hoverOffset: 6
        }
      ]
    };
  }, [sortedCandidates]);

  // Confetti trigger when winner is clear and election final
  useEffect(() => {
    if (!selectedElection) {
      setConfettiRun(false);
      return;
    }
    const isFinal = selectedElection.status === 'Ended' || selectedElection.status === 'ResultDeclared';
    if (isFinal && sortedCandidates.length > 0) {
      const top = sortedCandidates[0];
      const second = sortedCandidates[1] || { voteCount: 0 };
      if ((top.voteCount || 0) > (second.voteCount || 0)) {
        setConfettiRun(true);
        const t = setTimeout(() => setConfettiRun(false), 7000);
        return () => clearTimeout(t);
      }
    }
  }, [selectedElection, sortedCandidates]);

  // Renderers
  const renderElectionSelector = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-3">Select Election</h3>
      <div className="space-y-2 max-h-96 overflow-auto pr-2">
        {(!elections || elections.length === 0) && <p className="text-sm text-gray-500">No elections available</p>}
        {elections.map((e) => {
          const id = e.electionId ?? e._id;
          const isEnded = e.status === 'Ended' || e.status === 'ResultDeclared';
          return (
            <button
              key={id}
              onClick={() => setSelectedElectionId(id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${String(selectedElectionId) === String(id) ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'hover:bg-gray-50'} border`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-gray-500">{new Date(e.startTime).toLocaleString()} - {new Date(e.endTime).toLocaleString()}</div>
                </div>
                <div className="text-sm">
                  <span className={`px-2 py-1 rounded-full text-white text-xs ${isEnded ? 'bg-purple-600' : 'bg-gray-400'}`}>
                    {e.status}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSummaryCard = () => {
    if (!selectedElection) return null;
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{selectedElection.name}</h2>
            <p className="text-sm text-gray-600 mb-2">{selectedElection.description}</p>
            <div className="text-xs text-gray-500">
              <div>Election ID: <span className="font-mono">{selectedElection.electionId ?? selectedElection._id}</span></div>
              <div>Contract: <span className="font-mono">{(selectedElection.contractAddress || '').slice(0, 10)}...{(selectedElection.contractAddress || '').slice(-6)}</span></div>
              <div>Period: {new Date(selectedElection.startTime).toLocaleString()} — {new Date(selectedElection.endTime).toLocaleString()}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Total Candidates</div>
            <div className="text-2xl font-bold">{candidates.length}</div>
            <div className="text-sm text-gray-500 mt-2">Total Votes</div>
            <div className="text-2xl font-bold">{totalVotes}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <h4 className="font-semibold mb-3">Votes by Candidate (Bar)</h4>
        <div style={{ height: 300 }}>
          <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4">
        <h4 className="font-semibold mb-3">Vote Distribution (Pie)</h4>
        <div style={{ height: 300 }}>
          <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
        </div>
      </div>
    </div>
  );

  const renderResultsTable = () => (
    <div className="bg-white rounded-xl border shadow-sm p-4 mt-6">
      <h4 className="font-semibold mb-3">Detailed Results</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-2">Rank</th>
              <th className="px-4 py-2">Candidate</th>
              <th className="px-4 py-2">Party</th>
              <th className="px-4 py-2">Votes</th>
              <th className="px-4 py-2">Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedCandidates.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-sm text-gray-500">No candidates found</td></tr>
            )}
            {sortedCandidates.map((c, idx) => {
              const isWinner = idx === 0;
              return (
                <tr key={c.candidateId ?? c._id} className={`${isWinner ? 'bg-yellow-50' : ''}`}>
                  <td className="px-4 py-3 align-top">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{c.candidateAddress?.slice(0,8)}...{c.candidateAddress?.slice(-6)}</div>
                  </td>
                  <td className="px-4 py-3">{c.party || '-'}</td>
                  <td className="px-4 py-3">{c.voteCount || 0}</td>
                  <td className="px-4 py-3">{percentage(c.voteCount || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWinner = () => {
    if (!sortedCandidates || sortedCandidates.length === 0) return null;
    const winner = sortedCandidates[0];
    return (
      <div className="bg-white rounded-xl border shadow-sm p-6 mt-6 flex flex-col lg:flex-row items-center gap-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Winner</h3>
          <div className="mt-3 flex items-center space-x-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {winner.name ? winner.name.charAt(0) : 'W'}
            </div>
            <div>
              <div className="text-xl font-bold">{winner.name}</div>
              <div className="text-sm text-gray-500">{winner.party || 'Independent'}</div>
              <div className="mt-2 text-sm text-gray-700">Votes: <span className="font-medium">{winner.voteCount || 0}</span> ({percentage(winner.voteCount || 0)})</div>
              <div className="mt-2 text-xs text-gray-500">Address: <span className="font-mono">{winner.candidateAddress}</span></div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          <Link to={`/election/${selectedElectionId}/results`} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium">
            View Full Results Page
          </Link>
        </div>
      </div>
    );
  };

  const renderTransactionLog = () => (
    <div className="bg-white rounded-xl border shadow-sm p-4 mt-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Transaction Log</h4>
        <a
          className="text-sm text-blue-600"
          target="_blank"
          rel="noreferrer"
          href={
            selectedElection?.contractAddress
              ? `https://sepolia.etherscan.io/address/${selectedElection.contractAddress}`
              : '#'
          }
        >
          View Contract on Etherscan
        </a>
      </div>

      <div className="mt-3 max-h-60 overflow-auto">
        {transactions.length === 0 && (
          <div className="text-sm text-gray-500">No recent transactions available.</div>
        )}

        {transactions.map((t, idx) => (
          <div key={t.txHash ?? idx} className="p-3 border-b last:border-b-0">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-mono text-xs text-gray-600">{t.txHash?.slice(0, 12)}...{t.txHash?.slice(-6)}</div>
                <div className="text-sm">{t.action || 'Vote' } • {t.candidateName || t.candidateId || ''}</div>
              </div>
              <div className="text-xs text-gray-500">{new Date(t.timestamp || t.createdAt || Date.now()).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 text-center">Loading...</div>
      </div>
    );
  }

  if (!selectedElection) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
          No election selected.
        </div>
      </div>
    );
  }

  // Access control - only show results if election is ended or resultdeclared
  const allowed = selectedElection.status === 'Ended' || selectedElection.status === 'ResultDeclared';
  if (!allowed) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold">Election results are not available yet</h3>
          <p className="text-sm text-gray-600 mt-2">This page is only visible when the election status is Ended or ResultDeclared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {confettiRun && <Confetti numberOfPieces={400} recycle={false} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {renderElectionSelector()}
          {renderSummaryCard()}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {renderCharts()}
          {renderResultsTable()}
          {renderWinner()}
          {renderTransactionLog()}
        </div>
      </div>
    </div>
  );
};

export default CreateElection;