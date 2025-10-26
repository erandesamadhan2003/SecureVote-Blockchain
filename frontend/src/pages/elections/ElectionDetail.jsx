import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import ElectionDetails from "../../components/election/ElectionDetails.jsx";
import CandidateList from "../../components/candidate/CandidateList.jsx";
import ResultsTable from "../../components/results/ResultsTable.jsx";
import WinnerCard from "../../components/results/WinnerCard.jsx";
import VoteChart from "../../components/results/VoteChart.jsx";
import ResultsExport from "../../components/results/ResultsExport.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import useAuth from "../../hooks/useAuth.js";
import electionService from "../../services/electionService.js";
import candidateService from "../../services/candidateService.js";
import voteService from "../../services/voteService.js";
import api from "../../services/api.js";

export default function ElectionDetail() {
    const { electionId } = useParams();
    const { isManager, isAuthority, isSuperAdmin } = useAuth();
    const canManage = isManager || isAuthority || isSuperAdmin;

    const [election, setElection] = useState(null);
    const [activeTab, setActiveTab] = useState("overview"); // overview | candidates | voters | results
    const [isLoading, setIsLoading] = useState(false);

    const [candidates, setCandidates] = useState([]);
    const [candidatesLoading, setCandidatesLoading] = useState(false);

    const [voters, setVoters] = useState([]);
    const [votersLoading, setVotersLoading] = useState(false);

    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [winner, setWinner] = useState(null);
    const [totalVotes, setTotalVotes] = useState(0);

    const loadElection = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await electionService.getElectionById(electionId);
            const e = res?.election ?? res;
            setElection(e || null);
        } catch (err) {
            console.error("Failed to load election:", err);
            setElection(null);
        } finally {
            setIsLoading(false);
        }
    }, [electionId]);

    const loadCandidates = useCallback(async () => {
        setCandidatesLoading(true);
        try {
            const res = await candidateService.getCandidatesByElection(electionId);
            const list = res?.candidates ?? res?.candidates ?? res ?? [];
            setCandidates(Array.isArray(list) ? list : (list?.candidates ?? []));
        } catch (err) {
            console.error("Failed to load candidates:", err);
            setCandidates([]);
        } finally {
            setCandidatesLoading(false);
        }
    }, [electionId]);

    const loadResults = useCallback(async () => {
        setResultsLoading(true);
        try {
            const res = await api.get(`/results/${electionId}`);
            // backend returns { electionId, count, ids, names, votes } in controller
            if (res && res.ids && res.names && res.votes) {
                const total = (res.votes || []).reduce((s, v) => s + Number(v), 0);
                setTotalVotes(total);
                const arr = (res.ids || []).map((id, idx) => ({
                    candidateId: id,
                    name: res.names[idx] || "",
                    votes: Number(res.votes[idx] || 0),
                    imageHash: undefined
                }));
                setResults(arr);
            } else if (Array.isArray(res)) {
                setResults(res);
                setTotalVotes(res.reduce((s, r) => s + Number(r.votes || 0), 0));
            } else {
                setResults([]);
            }

            // try winner endpoint
            try {
                const w = await api.get(`/results/${electionId}/winner`);
                const winnerObj = w?.winner ?? (w?.winnerId ? { candidateId: w.winnerId } : null);
                setWinner(winnerObj || null);
            } catch (e) {
                setWinner(null);
            }
        } catch (err) {
            console.error("Failed to load results:", err);
            setResults([]);
            setWinner(null);
            setTotalVotes(0);
        } finally {
            setResultsLoading(false);
        }
    }, [electionId]);

    const loadVoters = useCallback(async () => {
        setVotersLoading(true);
        try {
            // backend endpoint for voter list may vary; try common routes, fallback to total count
            try {
                const res = await api.get(`/elections/${electionId}/voters`);
                setVoters(res?.voters ?? res ?? []);
            } catch {
                // fall back to votes service total and show placeholder
                const t = await voteService.getTotalVoters(electionId);
                setVoters(Array.isArray(t?.voters) ? t.voters : []);
            }
        } catch (err) {
            console.error("Failed to load voters:", err);
            setVoters([]);
        } finally {
            setVotersLoading(false);
        }
    }, [electionId]);

    useEffect(() => {
        loadElection();
    }, [loadElection]);

    useEffect(() => {
        if (activeTab === "candidates") loadCandidates();
        if (activeTab === "results") loadResults();
        if (activeTab === "voters" && canManage) loadVoters();
    }, [activeTab, loadCandidates, loadResults, loadVoters, canManage]);

    const handleStatusChange = async (target) => {
        try {
            await electionService.updateElectionStatus(electionId, target);
            // refresh election
            await loadElection();
        } catch (err) {
            console.error("Status change failed:", err);
        }
    };

    const isResultsAvailable = (election?.status === "Ended" || election?.status === "ResultDeclared");

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <ElectionDetails election={election} onStatusChange={handleStatusChange} />

            <Card>
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab("overview")} className={`px-3 py-1 rounded ${activeTab === "overview" ? "bg-blue-100" : "hover:bg-gray-100"}`}>Overview</button>
                        <button onClick={() => setActiveTab("candidates")} className={`px-3 py-1 rounded ${activeTab === "candidates" ? "bg-blue-100" : "hover:bg-gray-100"}`}>Candidates</button>
                        {canManage && <button onClick={() => setActiveTab("voters")} className={`px-3 py-1 rounded ${activeTab === "voters" ? "bg-blue-100" : "hover:bg-gray-100"}`}>Voters</button>}
                        {isResultsAvailable && <button onClick={() => setActiveTab("results")} className={`px-3 py-1 rounded ${activeTab === "results" ? "bg-blue-100" : "hover:bg-gray-100"}`}>Results</button>}
                    </div>

                    <div className="text-xs text-gray-500">{election?.name ?? ""}</div>
                </div>

                <div className="mt-4">
                    {activeTab === "overview" && (
                        <div className="prose text-sm">
                            <h3 className="text-lg font-medium">Overview</h3>
                            <p>{election?.longDescription ?? election?.description ?? "No overview available."}</p>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-500">Candidates</div>
                                    <div className="font-medium">{election?.totalCandidates ?? "-"}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-500">Registered Voters</div>
                                    <div className="font-medium">{election?.totalVoters ?? "-"}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-500">Votes Cast</div>
                                    <div className="font-medium">{election?.totalVotes ?? "-"}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "candidates" && (
                        <div>
                            <CandidateList candidates={candidates} mode={(election?.status === "Voting") ? "vote" : "view"} isLoading={candidatesLoading} onCandidateAction={() => { }} />
                        </div>
                    )}

                    {activeTab === "voters" && canManage && (
                        <div>
                            {votersLoading ? <div className="text-sm text-gray-500">Loading voters…</div> : (
                                <>
                                    {voters.length === 0 ? <div className="text-sm text-gray-500">No registered voters found.</div> : (
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-700">Total registered voters: {voters.length}</div>
                                            <ul className="text-xs list-disc list-inside">
                                                {voters.map((v, i) => <li key={i} className="font-mono text-xs">{String(v)}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="mt-3">
                                        <Button variant="primary" size="small" onClick={() => setActiveTab("voters")}>Register Voter</Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "results" && isResultsAvailable && (
                        <div className="space-y-4">
                            {resultsLoading ? (
                                <div className="text-sm text-gray-500">Loading results…</div>
                            ) : (
                                <>
                                    <div>
                                        <WinnerCard winner={winner || (results[0] ?? null)} runnerUp={results[1] ?? null} totalVotes={totalVotes} onShare={() => { /* optional */ }} />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <ResultsTable results={results} totalVoters={election?.totalVoters} totalVotes={totalVotes} />
                                        <div>
                                            <VoteChart results={results} chartType="pie" />
                                            <div className="mt-3">
                                                <ResultsExport election={election} results={results} winner={winner} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
