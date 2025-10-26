import React, { useEffect, useMemo, useState } from "react";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import VoteChart from "../../components/results/VoteChart.jsx";
import useAuth from "../../hooks/useAuth.js";
import api from "../../services/api.js";
import useToast from "../../hooks/useToast.js";
import { formatNumber } from "../../utils/helpers.js";

export default function AdminDashboard() {
    const { isSuperAdmin } = useAuth();
    const { showSuccess, showError } = useToast();

    const [loading, setLoading] = useState(true);
    const [systemStats, setSystemStats] = useState({
        totalUsers: "—",
        roleBreakdown: {},
        activeElections: "—",
        totalVotes: "—",
        uptime: "—"
    });
    const [chartData, setChartData] = useState({
        electionsOverTime: [],
        userGrowth: [],
        voteActivity: [],
        roleDistribution: []
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [activityFilter, setActivityFilter] = useState("all");
    const [systemHealth, setSystemHealth] = useState({
        db: false,
        blockchain: false,
        apiResponseMs: null,
        lastSync: null
    });

    const fetchAll = async () => {
        setLoading(true);
        try {
            // backend exposes dashboard endpoints at /api/dashboard/*
            const [statsRes, activitiesRes, healthRes] = await Promise.allSettled([
                api.get("/dashboard/stats"),
                api.get("/dashboard/activities?limit=20"),
                api.get("/dashboard/health")
            ]);

            if (statsRes.status === "fulfilled" && statsRes.value) {
                const s = statsRes.value;
                setSystemStats({
                    totalUsers: s.totalUsers ?? s.users ?? "—",
                    roleBreakdown: s.roleBreakdown ?? s.roles ?? {},
                    activeElections: s.activeElections ?? s.active ?? "—",
                    totalVotes: s.totalVotes ?? s.votes ?? "—",
                    uptime: s.uptime ?? "—"
                });
                setChartData({
                    electionsOverTime: s.electionsOverTime ?? [],
                    userGrowth: s.userGrowth ?? [],
                    voteActivity: s.voteActivity ?? [],
                    roleDistribution: s.roleDistribution ?? []
                });
            }

            if (activitiesRes.status === "fulfilled" && Array.isArray(activitiesRes.value)) {
                setRecentActivities(activitiesRes.value);
            } else if (activitiesRes.status === "fulfilled" && activitiesRes.value?.activities) {
                setRecentActivities(activitiesRes.value.activities);
            }

            // healthRes may be server root or a health object; try to map best-effort
            if (healthRes.status === "fulfilled" && healthRes.value) {
                const h = healthRes.value;
                // if root returned { status, env } we set minimal info; if detailed health exists use that
                setSystemHealth({
                    db: !!h.dbStatus && h.dbStatus === "ok",
                    blockchain: !!h.blockchain && h.blockchain.status === "ok",
                    apiResponseMs: h.apiResponseMs ?? null,
                    lastSync: h.lastSync ?? null
                });
            }
        } catch (err) {
            console.error("admin dashboard load error", err);
            showError("Failed to load admin data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isSuperAdmin) return;
        fetchAll();
        const interval = setInterval(async () => {
            try {
                const h = await api.get("/dashboard/health").catch(() => null);
                if (h) {
                    setSystemHealth({
                        db: !!h.dbStatus && h.dbStatus === "ok",
                        blockchain: !!h.blockchain && h.blockchain.status === "ok",
                        apiResponseMs: h.apiResponseMs ?? null,
                        lastSync: h.lastSync ?? null
                    });
                }
            } catch { }
        }, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuperAdmin]);

    const activityTypes = useMemo(() => {
        const types = new Set();
        recentActivities.forEach((a) => a.type && types.add(a.type));
        return ["all", ...Array.from(types)];
    }, [recentActivities]);

    const filteredActivities = useMemo(() => {
        if (activityFilter === "all") return recentActivities;
        return recentActivities.filter((a) => a.type === activityFilter);
    }, [recentActivities, activityFilter]);

    const promptAndCallRole = async (endpoint, roleLabel) => {
        const addr = window.prompt(`Enter wallet address to add as ${roleLabel}`);
        if (!addr) return;
        try {
            await api.post(`/roles/${endpoint}`, { account: addr });
            showSuccess(`${roleLabel} role granted to ${addr}`);
            // optionally refresh stats
            fetchAll();
        } catch (err) {
            showError(err?.message || "Action failed");
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Card>
                    <h2 className="text-lg font-semibold">Admin Dashboard</h2>
                    <p className="mt-2 text-sm text-gray-600">You do not have permission to view this page.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
                    <div className="text-sm text-gray-600">System overview & controls</div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="small" onClick={() => fetchAll()} disabled={loading}>Refresh</Button>
                    <Button variant="primary" size="small" onClick={() => window.location.href = "/admin/users"}>View All Users</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <div className="text-sm text-gray-500">Total Users</div>
                    <div className="text-2xl font-semibold mt-2">{formatNumber(systemStats.totalUsers)}</div>
                    <div className="text-xs text-gray-500 mt-2">Roles: {Object.entries(systemStats.roleBreakdown || {}).map(([k, v]) => `${k}:${v}`).join(", ") || "—"}</div>
                </Card>

                <Card className="p-4 text-center">
                    <div className="text-sm text-gray-500">Active Elections</div>
                    <div className="text-2xl font-semibold mt-2">{formatNumber(systemStats.activeElections)}</div>
                </Card>

                <Card className="p-4 text-center">
                    <div className="text-sm text-gray-500">Total Votes (all time)</div>
                    <div className="text-2xl font-semibold mt-2">{formatNumber(systemStats.totalVotes)}</div>
                </Card>

                <Card className="p-4 text-center">
                    <div className="text-sm text-gray-500">System Uptime</div>
                    <div className="text-2xl font-semibold mt-2">{systemStats.uptime ?? "—"}</div>
                    <div className="text-xs text-gray-500 mt-2">API: {systemHealth.apiResponseMs ? `${systemHealth.apiResponseMs} ms` : "—"}</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <h3 className="text-sm font-medium">Charts</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-gray-500 mb-2">Elections created (over time)</div>
                                <VoteChart results={chartData.electionsOverTime || []} chartType="bar" />
                            </div>

                            <div>
                                <div className="text-xs text-gray-500 mb-2">User growth</div>
                                <VoteChart results={chartData.userGrowth || []} chartType="bar" />
                            </div>

                            <div>
                                <div className="text-xs text-gray-500 mb-2">Vote activity</div>
                                <VoteChart results={chartData.voteActivity || []} chartType="bar" />
                            </div>

                            <div>
                                <div className="text-xs text-gray-500 mb-2">Role distribution</div>
                                <VoteChart results={chartData.roleDistribution || []} chartType="pie" />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Recent Activity</h3>
                            <div className="text-xs text-gray-500">Last {recentActivities.length} items</div>
                        </div>

                        <div className="mt-3">
                            <div className="flex items-center gap-2 mb-3">
                                <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="px-2 py-1 border rounded text-sm">
                                    {activityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <Button variant="outline" size="small" onClick={() => { setActivityFilter("all"); }}>Clear</Button>
                            </div>

                            <ul className="space-y-2 max-h-64 overflow-auto">
                                {filteredActivities.length === 0 ? (
                                    <div className="text-sm text-gray-500">No recent activities</div>
                                ) : (
                                    filteredActivities.map((a, i) => (
                                        <li key={i} className="border-b py-2">
                                            <div className="text-sm font-medium">{a.title ?? a.type ?? "Activity"}</div>
                                            <div className="text-xs text-gray-500">{a.message ?? a.details ?? ""}</div>
                                            <div className="text-xs text-gray-400 mt-1">{a.time ? new Date(a.time).toLocaleString() : ""}</div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </Card>
                </div>

                <aside className="space-y-4">
                    <Card>
                        <h3 className="text-sm font-medium">Quick Actions</h3>
                        <div className="mt-3 flex flex-col gap-2">
                            <Button variant="primary" size="small" onClick={() => promptAndCallRole("election-manager", "Election Manager")}>Add Election Manager</Button>
                            <Button variant="primary" size="small" onClick={() => promptAndCallRole("election-authority", "Election Authority")}>Add Election Authority</Button>
                            <Button variant="outline" size="small" onClick={() => (window.location.href = "/admin/users")}>View All Users</Button>
                            <Button variant="outline" size="small" onClick={() => (window.location.href = "/admin/settings")}>System Settings</Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-medium">System Health</h3>
                        <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <div>Database</div>
                                <div className={`text-xs font-medium ${systemHealth.db ? "text-green-600" : "text-red-600"}`}>{systemHealth.db ? "Connected" : "Down"}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>Blockchain</div>
                                <div className={`text-xs font-medium ${systemHealth.blockchain ? "text-green-600" : "text-red-600"}`}>{systemHealth.blockchain ? "Connected" : "Disconnected"}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>API RTT</div>
                                <div className="text-xs">{systemHealth.apiResponseMs ? `${systemHealth.apiResponseMs} ms` : "—"}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>Last sync</div>
                                <div className="text-xs">{systemHealth.lastSync ? new Date(systemHealth.lastSync).toLocaleString() : "—"}</div>
                            </div>
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
}

