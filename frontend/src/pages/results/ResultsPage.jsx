import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import WinnerCard from "../../components/results/WinnerCard.jsx";
import ResultsTable from "../../components/results/ResultsTable.jsx";
import VoteChart from "../../components/results/VoteChart.jsx";
import ResultsExport from "../../components/results/ResultsExport.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import electionService from "../../services/electionService.js";
import api from "../../services/api.js";
import useToast from "../../hooks/useToast.js";
import { formatNumber } from "../../utils/helpers.js";

export default function ResultsPage() {
    const { electionId } = useParams();
    const navigate = useNavigate();
    const { showError } = useToast();

    const [election, setElection] = useState(null);
    const [results, setResults] = useState([]);
    const [winner, setWinner] = useState(null);
    const [totalVotes, setTotalVotes] = useState(0);
    const [txProof, setTxProof] = useState(null);
    const [activeTab, setActiveTab] = useState("table"); // table | chart
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const eRes = await electionService.getElectionById(electionId).catch(() => null);
                if (!mounted) return;
                setElection(eRes?.election ?? eRes ?? null);

                // fetch results and winner
                const r = await api.get(`/results/${electionId}`).catch(() => null);
                const w = await api.get(`/results/${electionId}/winner`).catch(() => null);
                if (!mounted) return;

                let parsed = [];
                if (r) {
                    if (Array.isArray(r)) parsed = r;
                    else if (r.ids && r.names && r.votes) {
                        parsed = (r.ids || []).map((id, idx) => ({
                            candidateId: id,
                            name: r.names[idx] || "",
                            votes: Number(r.votes[idx] || 0)
                        }));
                    } else parsed = r?.candidates ?? [];
                }
                setResults(parsed);
                const total = parsed.reduce((s, it) => s + Number(it.votes || 0), 0);
                setTotalVotes(total);

                if (w) {
                    const winnerObj = w?.winner ?? (w?.winnerId ? { candidateId: w.winnerId } : null);
                    setWinner(winnerObj || (parsed[0] ?? null));
                } else {
                    setWinner(parsed[0] ?? null);
                }

                // try to find tx proof on election record or separate endpoint
                try {
                    const info = await api.get(`/elections/${electionId}`).catch(() => null);
                    const tx = info?.election?.resultTxHash ?? info?.election?.transactionHash ?? null;
                    setTxProof(tx || null);
                } catch { /* ignore */ }
            } catch (err) {
                showError(err?.message || "Failed to load results");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [electionId, showError]);

    const stats = useMemo(() => {
        const candidates = results.length;
        const winnerVotes = winner?.voteCount ?? (results[0]?.votes ?? 0);
        const runnerUpVotes = results[1]?.votes ?? 0;
        const marginVotes = Number(winnerVotes) - Number(runnerUpVotes);
        const marginPct = totalVotes ? ((marginVotes / totalVotes) * 100).toFixed(2) : "0.00";
        return { candidates, winnerVotes, runnerUpVotes, marginVotes, marginPct };
    }, [results, winner, totalVotes]);

    if (loading) {
        return <div className="p-6 text-center text-sm text-gray-600">Loading results…</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{election?.name ?? "Election Results"}</h1>
                    <div className="text-xs text-gray-500 mt-1">RESULTS</div>
                </div>

                <div className="flex items-center gap-3">
                    <ResultsExport election={election} results={results} winner={winner} />
                    <Button variant="outline" size="small" onClick={() => navigate(-1)}>Back</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <WinnerCard winner={winner || (results[0] ?? null)} runnerUp={results[1] ?? null} totalVotes={totalVotes} />
                    <Card>
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <button className={`px-3 py-1 rounded ${activeTab === "table" ? "bg-blue-100" : "hover:bg-gray-100"}`} onClick={() => setActiveTab("table")}>Table View</button>
                                <button className={`px-3 py-1 rounded ${activeTab === "chart" ? "bg-blue-100" : "hover:bg-gray-100"}`} onClick={() => setActiveTab("chart")}>Chart View</button>
                            </div>
                            <div className="text-sm text-gray-600">Total votes: <strong>{formatNumber(totalVotes)}</strong></div>
                        </div>

                        <div className="mt-4">
                            {activeTab === "table" ? (
                                <ResultsTable results={results} totalVoters={election?.totalVoters} totalVotes={totalVotes} />
                            ) : (
                                <VoteChart results={results} chartType="pie" />
                            )}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-medium">Transaction Proof</h3>
                        <div className="mt-3 text-sm text-gray-700">
                            {txProof ? (
                                <div className="flex items-center justify-between">
                                    <div className="font-mono text-sm">{txProof}</div>
                                    <a className="text-xs text-blue-600" href={`${import.meta.env.VITE_ETHERSCAN_URL || "https://sepolia.etherscan.io"}/tx/${txProof}`} target="_blank" rel="noreferrer">View on explorer</a>
                                </div>
                            ) : (
                                <div>No on-chain result declaration proof found.</div>
                            )}
                        </div>
                        <div className="mt-3">
                            <Button variant="outline" size="small" onClick={() => navigator.clipboard?.writeText(txProof || "")}>Copy TX</Button>
                        </div>
                    </Card>
                </div>

                <aside className="space-y-4">
                    <Card>
                        <h3 className="text-sm font-medium">Statistics</h3>
                        <div className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between"><div>Total votes</div><div className="font-medium">{formatNumber(totalVotes)}</div></div>
                            <div className="flex justify-between"><div>Total candidates</div><div className="font-medium">{stats.candidates}</div></div>
                            <div className="flex justify-between"><div>Winning margin</div><div className="font-medium">{formatNumber(stats.marginVotes)} ({stats.marginPct}%)</div></div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-medium">Share</h3>
                        <div className="mt-3 space-y-2">
                            <Button variant="primary" size="small" onClick={() => { navigator.clipboard?.writeText(window.location.href); }}>Copy Results Link</Button>
                            <Button variant="outline" size="small" onClick={() => window.print()}>Print</Button>
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
