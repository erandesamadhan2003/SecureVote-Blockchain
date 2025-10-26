import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import useAuth from "../hooks/useAuth.js";
import electionService from "../services/electionService.js";

export default function HomePage() {
    const { isAuthenticated, login } = useAuth();
    const navigate = useNavigate();

    const [loadingStats, setLoadingStats] = useState(false);
    const [stats, setStats] = useState({
        totalElections: "—",
        activeElections: "—",
        totalVotes: "—",
        activeVoters: "—"
    });

    useEffect(() => {
        let mounted = true;
        const loadStats = async () => {
            setLoadingStats(true);
            try {
                const all = await electionService.getAllElections();
                const active = await electionService.getActiveElections();
                const list = Array.isArray(all) ? all : (all?.elections ?? all ?? []);
                const activeList = Array.isArray(active) ? active : (active?.elections ?? active ?? []);
                // try to glean totalVotes if backend provided field
                const totalVotes = list.reduce((s, e) => s + Number(e.totalVotes ?? e.totalVotesOnChain ?? 0), 0);
                if (!mounted) return;
                setStats({
                    totalElections: Array.isArray(list) ? list.length : (list?.length ?? "—"),
                    activeElections: Array.isArray(activeList) ? activeList.length : (activeList?.length ?? "—"),
                    totalVotes: totalVotes > 0 ? totalVotes : "—",
                    activeVoters: "—"
                });
            } catch (e) {
                // ignore, keep placeholders
            } finally {
                if (mounted) setLoadingStats(false);
            }
        };
        loadStats();
        return () => { mounted = false; };
    }, []);

    const handleGetStarted = async () => {
        if (isAuthenticated) {
            navigate("/dashboard");
            return;
        }
        try {
            await login();
            navigate("/dashboard");
        } catch (e) {
            // user may cancel wallet connect; no-op
        }
    };

    return (
        <div className="min-h-[80vh] bg-gradient-to-b from-white to-slate-50">
            <div className="max-w-7xl mx-auto px-4 py-16">
                {/* Hero */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900">Secure Blockchain Voting Platform</h1>
                        <p className="mt-4 text-lg text-slate-600">Transparent, Secure, Tamper-proof elections powered by blockchain.</p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button variant="primary" size="large" onClick={handleGetStarted}>
                                {isAuthenticated ? "Go to Dashboard" : "Connect Wallet"}
                            </Button>
                            <Link to="/elections">
                                <Button variant="outline" size="large">Browse Elections</Button>
                            </Link>
                        </div>

                        <div className="mt-8 grid grid-cols-3 gap-4">
                            <Card className="p-4 text-center">
                                <div className="text-sm text-gray-500">Total Elections</div>
                                <div className="text-2xl font-semibold mt-2">{loadingStats ? "…" : stats.totalElections}</div>
                            </Card>
                            <Card className="p-4 text-center">
                                <div className="text-sm text-gray-500">Active Elections</div>
                                <div className="text-2xl font-semibold mt-2">{loadingStats ? "…" : stats.activeElections}</div>
                            </Card>
                            <Card className="p-4 text-center">
                                <div className="text-sm text-gray-500">Total Votes</div>
                                <div className="text-2xl font-semibold mt-2">{loadingStats ? "…" : stats.totalVotes}</div>
                            </Card>
                        </div>
                    </div>

                    <div>
                        {/* Visual / Illustration placeholder */}
                        <div className="w-full h-72 rounded-lg bg-gradient-to-r from-indigo-50 to-teal-50 border border-gray-100 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-3xl font-semibold text-indigo-700">Secure</div>
                                <div className="mt-2 text-sm text-slate-600">Blockchain-based, auditable elections</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-16">
                    <h2 className="text-xl font-semibold">Features</h2>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6">
                            <div className="text-lg font-medium">Secure</div>
                            <div className="mt-2 text-sm text-slate-600">Immutable records on-chain ensure votes cannot be tampered with.</div>
                        </Card>
                        <Card className="p-6">
                            <div className="text-lg font-medium">Transparent</div>
                            <div className="mt-2 text-sm text-slate-600">Anyone can audit election results and transactions on the blockchain.</div>
                        </Card>
                        <Card className="p-6">
                            <div className="text-lg font-medium">Tamper-proof</div>
                            <div className="mt-2 text-sm text-slate-600">Decentralized consensus protects election integrity.</div>
                        </Card>
                    </div>
                </div>

                {/* How it works */}
                <div className="mt-16">
                    <h2 className="text-xl font-semibold">How it works</h2>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 text-center">
                            <div className="text-2xl font-bold">1</div>
                            <div className="mt-2 font-medium">Connect Wallet</div>
                            <div className="mt-2 text-sm text-slate-600">Use MetaMask to authenticate your wallet.</div>
                        </Card>
                        <Card className="p-6 text-center">
                            <div className="text-2xl font-bold">2</div>
                            <div className="mt-2 font-medium">Register / Vote</div>
                            <div className="mt-2 text-sm text-slate-600">Register as voter or candidate (if eligible) and cast your vote.</div>
                        </Card>
                        <Card className="p-6 text-center">
                            <div className="text-2xl font-bold">3</div>
                            <div className="mt-2 font-medium">View Results</div>
                            <div className="mt-2 text-sm text-slate-600">Results are published on-chain and can be verified publicly.</div>
                        </Card>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-16 text-center">
                    <h3 className="text-lg font-semibold">Ready to get started?</h3>
                    <div className="mt-4">
                        <Button variant="primary" size="large" onClick={handleGetStarted}>
                            {isAuthenticated ? "Go to Dashboard" : "Connect Wallet"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
