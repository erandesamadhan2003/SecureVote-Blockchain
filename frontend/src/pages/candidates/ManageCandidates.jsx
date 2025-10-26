import React, { useEffect, useMemo, useState } from "react";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import CandidateCard from "../../components/candidate/CandidateCard.jsx";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import electionService from "../../services/electionService.js";
import candidateService from "../../services/candidateService.js";
import Loading from "../../components/common/Loading.jsx";

export default function ManageCandidates() {
  const { isManager, isAuthority } = useAuth();
  const { showSuccess, showError } = useToast();

  const [elections, setElections] = useState([]);
  const [electionId, setElectionId] = useState("");
  const [activeFilter, setActiveFilter] = useState("Pending"); // Pending | Approved | Rejected | All
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadElections = async () => {
      try {
        // try to fetch elections in registration phase first, else all
        const res = await electionService.getAllElections({ status: "Registration" }).catch(() => null);
        let list = Array.isArray(res) ? res : (res?.elections ?? res);
        if (!list || list.length === 0) {
          const alt = await electionService.getAllElections().catch(() => []);
          list = Array.isArray(alt) ? alt : (alt?.elections ?? alt ?? []);
        }
        if (!mounted) return;
        setElections(list || []);
        if (!electionId && list && list[0]) setElectionId(list[0].electionId ?? list[0].id ?? "");
      } catch (err) {
        console.error("loadElections:", err);
      }
    };
    loadElections();
    return () => { mounted = false; };
  }, []); // run once

  useEffect(() => {
    if (!electionId) {
      setCandidates([]);
      return;
    }
    let mounted = true;
    const loadCandidates = async () => {
      setIsLoading(true);
      try {
        const statusParam = activeFilter === "All" ? undefined : activeFilter;
        const res = await candidateService.getCandidatesByElection(electionId, statusParam).catch(() => null);
        const list = Array.isArray(res) ? res : (res?.candidates ?? res ?? []);
        if (!mounted) return;
        setCandidates(Array.isArray(list) ? list : []);
        setSelected(new Set());
      } catch (err) {
        console.error("loadCandidates:", err);
        showError(err?.message || "Failed to load candidates");
        setCandidates([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadCandidates();
    return () => { mounted = false; };
  }, [electionId, activeFilter, showError]);

  const counts = useMemo(() => {
    const pending = candidates.filter(c => (c.status || "").toLowerCase() === "pending").length;
    const approved = candidates.filter(c => (c.status || "").toLowerCase() === "approved").length;
    const rejected = candidates.filter(c => (c.status || "").toLowerCase() === "rejected").length;
    return { pending, approved, rejected };
  }, [candidates]);

  const toggleSelect = (candidateId) => {
    setSelected((s) => {
      const copy = new Set(s);
      if (copy.has(candidateId)) copy.delete(candidateId);
      else copy.add(candidateId);
      return copy;
    });
  };

  const approveOne = async (candidate) => {
    try {
      setIsLoading(true);
      await candidateService.validateCandidate(electionId, candidate.candidateId ?? candidate.id ?? candidate._id, true);
      showSuccess("Candidate approved");
      // refresh
      const res = await candidateService.getCandidatesByElection(electionId, activeFilter === "All" ? undefined : activeFilter);
      const list = Array.isArray(res) ? res : (res?.candidates ?? res ?? []);
      setCandidates(Array.isArray(list) ? list : []);
    } catch (err) {
      showError(err?.message || "Approve failed");
    } finally {
      setIsLoading(false);
    }
  };

  const rejectOne = async (candidate) => {
    try {
      setIsLoading(true);
      await candidateService.validateCandidate(electionId, candidate.candidateId ?? candidate.id ?? candidate._id, false);
      showSuccess("Candidate rejected");
      const res = await candidateService.getCandidatesByElection(electionId, activeFilter === "All" ? undefined : activeFilter);
      const list = Array.isArray(res) ? res : (res?.candidates ?? res ?? []);
      setCandidates(Array.isArray(list) ? list : []);
    } catch (err) {
      showError(err?.message || "Reject failed");
    } finally {
      setIsLoading(false);
    }
  };

  const runBatch = async (approve = true) => {
    if (selected.size === 0) return;
    setIsBatchRunning(true);
    try {
      const ids = Array.from(selected);
      for (const cid of ids) {
        try {
          await candidateService.validateCandidate(electionId, cid, approve);
        } catch (e) {
          // continue with others but report error
          console.error("batch item failed", cid, e);
        }
      }
      showSuccess(`Batch ${approve ? "approve" : "reject"} completed`);
      // refresh list
      const res = await candidateService.getCandidatesByElection(electionId, activeFilter === "All" ? undefined : activeFilter);
      const list = Array.isArray(res) ? res : (res?.candidates ?? res ?? []);
      setCandidates(Array.isArray(list) ? list : []);
      setSelected(new Set());
    } catch (err) {
      showError(err?.message || "Batch action failed");
    } finally {
      setIsBatchRunning(false);
    }
  };

  if (!isManager && !isAuthority) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <h2 className="text-lg font-semibold">Manage Candidates</h2>
          <p className="mt-2 text-sm text-gray-600">You do not have permission to manage candidates.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Candidates</h1>
        <div className="flex items-center gap-3">
          <div>
            <select value={electionId} onChange={(e) => setElectionId(e.target.value)} className="px-3 py-2 border rounded">
              <option value="">Select election</option>
              {elections.map((el) => (
                <option key={el.electionId ?? el.id} value={el.electionId ?? el.id}>
                  {el.name} — {el.startTime ? new Date(el.startTime).toLocaleString() : "TBD"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {["Pending", "Approved", "Rejected", "All"].map((f) => (
              <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1 rounded text-sm ${activeFilter === f ? "bg-blue-100" : "hover:bg-gray-100"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Pending: <strong>{counts.pending}</strong> · Approved: <strong>{counts.approved}</strong> · Rejected: <strong>{counts.rejected}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="small" onClick={() => setSelected(new Set())}>Clear Selection</Button>
            <Button variant="danger" size="small" onClick={() => runBatch(false)} disabled={selected.size === 0 || isBatchRunning}>
              {isBatchRunning ? "Processing…" : `Reject Selected (${selected.size})`}
            </Button>
            <Button variant="primary" size="small" onClick={() => runBatch(true)} disabled={selected.size === 0 || isBatchRunning}>
              {isBatchRunning ? "Processing…" : `Approve Selected (${selected.size})`}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6"><Loading size="large" /></div>
        ) : candidates.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-600">No candidates found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {candidates.map((c) => {
              const id = c.candidateId ?? c.id ?? c._id ?? (c.candidateAddress || c.walletAddress);
              const checked = selected.has(String(id));
              return (
                <div key={String(id)} className="relative">
                  <label className="absolute right-2 top-2 z-10 inline-flex items-center bg-white rounded-full p-1 shadow">
                    <input type="checkbox" checked={checked} onChange={() => toggleSelect(String(id))} className="w-4 h-4" />
                  </label>

                  <CandidateCard
                    candidate={c}
                    mode="manage"
                    onApprove={() => approveOne(c)}
                    onReject={() => rejectOne(c)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
