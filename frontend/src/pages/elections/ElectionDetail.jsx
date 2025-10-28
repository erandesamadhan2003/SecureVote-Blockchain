import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
import VoterRegistration from "../../components/voting/VoterRegistration.jsx";
import useToast from "../../hooks/useToast.js";

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

    const { showSuccess, showError } = useToast();

    // show register modal state and progress
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerProgress, setRegisterProgress] = useState({ done: 0, total: 0 });

    // only managers or authorities may register voters (per request)
    const canRegister = isManager || isAuthority;

    // registration handler used by VoterRegistration component
    const handleRegisterComplete = async (voters, progressCb) => {
        if (!Array.isArray(voters) || voters.length === 0) throw new Error("No voters provided");
        setRegisterProgress({ done: 0, total: voters.length });

        // wrap child's progressCb so both child and this page get updates
        const wrappedProgressCb = (done) => {
            try {
                if (typeof progressCb === "function") progressCb(done);
            } catch (e) { /* ignore child cb errors */ }
            setRegisterProgress((p) => ({ ...p, done }));
        };

        try {
            if (voters.length === 1) {
                await voteService.registerVoter(electionId, voters[0]);
                wrappedProgressCb(1);
            } else {
                // call batch endpoint; we set done to total once finished
                await voteService.registerVotersBatch(electionId, voters);
                wrappedProgressCb(voters.length);
            }
            showSuccess(`Registered ${voters.length} voter(s)`);
            setShowRegisterModal(false);
        } catch (err) {
            showError(err?.message || "Registration failed");
            throw err;
        } finally {
            setRegisterProgress({ done: 0, total: 0 });
        }
    };

    const loadElection = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await electionService.getElectionById(electionId);
            // service now returns res.data (which may include { election })
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
            const list = res?.candidates ?? (Array.isArray(res) ? res : (res?.candidates ?? []));
            const arr = Array.isArray(list) ? list : [];
            setCandidates(arr);
            // attach totalCandidates to election object so overview displays correct count
            setElection((prev) => {
                if (!prev) return prev;
                // only update if different to avoid unnecessary renders
                if ((prev.totalCandidates ?? 0) === arr.length) return prev;
                return { ...prev, totalCandidates: arr.length };
            });
        } catch (err) {
            console.error("Failed to load candidates:", err);
            setCandidates([]);
        } finally {
            setCandidatesLoading(false);
        }
    }, [electionId]);

    // small resolver (kept local to avoid adding new util file)
    const resolveImageUrl = (id) => {
        if (!id) return null;
        const s = String(id).trim();
        if (s.startsWith("http://") || s.startsWith("https://")) return s;
        if (s.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${s.slice(7)}`;
        const isLikelyCid = /^Qm[a-zA-Z0-9]{44,}|^bafy/i.test(s);
        const isFilename = /\.(jpe?g|png|gif|webp|svg)$/i.test(s) || s.includes("_") || s.length < 80 && s.includes(".");
        const apiBase = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "") : "http://localhost:3000/api";
        const uploadsBase = apiBase.replace(/\/api\/?$/, "");
        if (isFilename) return `${uploadsBase}/uploads/${encodeURIComponent(s)}`;
        if (isLikelyCid) return `https://ipfs.io/ipfs/${s}`;
        if (s.length < 80) return `${uploadsBase}/uploads/${encodeURIComponent(s)}`;
        return `https://ipfs.io/ipfs/${s}`;
    };

    const loadResults = useCallback(async () => {
        setResultsLoading(true);
        try {
            const res = await api.get(`/results/${electionId}`);
            // backend returns { electionId, count, ids, names, votes } in controller
            if (res && res.ids && res.names && res.votes) {
                const total = (res.votes || []).reduce((s, v) => s + Number(v), 0);
                setTotalVotes(total);
                const arr = (res.ids || []).map((id, idx) => {
                    const imageHash = (res.imageHashes && res.imageHashes[idx]) || undefined;
                    return {
                        candidateId: id,
                        name: res.names[idx] || "",
                        votes: Number(res.votes[idx] || 0),
                        imageHash,
                        imageUrl: imageHash ? resolveImageUrl(imageHash) : undefined
                    };
                });
                setResults(arr);
            } else if (Array.isArray(res)) {
                // if array, try to enrich with imageUrl where possible
                const enriched = res.map((r) => ({ ...r, imageUrl: r.imageHash ? resolveImageUrl(r.imageHash) : r.imageUrl }));
                setResults(enriched);
                setTotalVotes(enriched.reduce((s, r) => s + Number(r.votes || 0), 0));
            } else {
                setResults([]);
            }

            // try winner endpoint
            try {
                const w = await api.get(`/results/${electionId}/winner`);
                const winnerObj = w?.winner ?? (w?.winnerId ? { candidateId: w.winnerId } : null);
                if (winnerObj) {
                    winnerObj.imageUrl = winnerObj.imageUrl || (winnerObj.imageHash ? resolveImageUrl(winnerObj.imageHash) : undefined);
                }
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
        // also load candidates immediately so overview shows counts/timeline info without switching tabs
        loadCandidates();
    }, [loadElection, loadCandidates]);

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
            // show user-friendly toast if available
            try { showError(err?.message || "Status change failed"); } catch { /* ignore if hook not present */ }
        }
    };

    const isResultsAvailable = (election?.status === "Ended" || election?.status === "ResultDeclared");

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            {isLoading ? (
                <Card>
                    <div className="p-6 text-center text-sm text-gray-600">Loading election…</div>
                </Card>
            ) : !election ? (
                <Card>
                    <div className="p-6 text-center">
                        <h3 className="text-lg font-medium">Election not found</h3>
                        <p className="mt-2 text-sm text-gray-600">Unable to load election details.</p>
                        <div className="mt-4">
                            <Button variant="outline" size="small" onClick={() => window.history.back()}>Go Back</Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <ElectionDetails election={election} onStatusChange={handleStatusChange} canManage={canManage} />

                        <div className="self-start space-y-2">
                            {String(election.status).toLowerCase() === "voting" && (
                                <div className="mb-2">
                                    <Link to={`/vote/${encodeURIComponent(election.electionId ?? election.id ?? "")}`}>
                                        <Button variant="primary" size="large">Vote now</Button>
                                    </Link>
                                </div>
                            )}

                            {/* Manager/Authority-only register button */}
                            {canRegister && (
                                <div>
                                    <Button variant="outline" size="medium" onClick={() => setShowRegisterModal(true)}>
                                        Register Voter
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

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
                                        {/* open same register modal */}
                                        <Button variant="primary" size="small" onClick={() => setShowRegisterModal(true)}>Register Voter</Button>
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

            {/* Inline modal / panel for registration */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded shadow max-w-2xl w-full p-4 relative">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium">Register Voter — Election {election?.electionId ?? election?.id ?? ""}</h3>
                            <button
                                aria-label="Close"
                                className="text-gray-500 hover:text-gray-800"
                                onClick={() => setShowRegisterModal(false)}
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-4">
                            <VoterRegistration
                                electionId={electionId}
                                onRegisterComplete={handleRegisterComplete}
                            />

                            {registerProgress.total > 0 && (
                                <div className="text-sm text-gray-600 mt-3">Progress: {registerProgress.done}/{registerProgress.total}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
