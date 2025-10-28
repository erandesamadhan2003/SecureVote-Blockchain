import React, { useEffect, useState } from "react";
import Card from "../components/common/Card.jsx";
import Button from "../components/common/Button.jsx";
import ElectionList from "../components/election/ElectionList.jsx";
import useAuth from "../hooks/useAuth.js";
import electionService from "../services/electionService.js";
import api from "../services/api.js";
import useToast from "../hooks/useToast.js";

export default function Dashboard() {
    const { user, isAuthenticated, isManager, isAuthority, isSuperAdmin, isVoter } = useAuth();
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        electionsAvailable: "—",
        electionsVoted: "—",
        upcomingElections: "—",
        resultsAvailable: "—",
        myElections: "—",
        totalCandidates: "—",
        totalVoters: "—",
        pendingApprovals: "—",
        totalUsers: "—",
        totalVotes: "—"
    });
    const [activities, setActivities] = useState([]);
    const [ongoing, setOngoing] = useState([]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            try {
                // try dashboard stats endpoint (optional)
                try {
                    const s = await api.get("/dashboard/stats");
                    if (mounted && s) setStats((prev) => ({ ...prev, ...s }));
                } catch {
                    // fallback: use electionService for some counts
                    const activeRes = await electionService.getActiveElections();
                    const allRes = await electionService.getAllElections();
                    const activeList = Array.isArray(activeRes) ? activeRes : (activeRes?.elections ?? []);
                    const allList = Array.isArray(allRes) ? allRes : (allRes?.elections ?? []);
                    if (mounted) {
                        // fetch upcoming and my elections first (can't use await inside the sync setStats callback)
                        const upcomingRes = await electionService.getUpcomingElections();
                        const myRes = await electionService.getMyElections();
                        const upcomingList = Array.isArray(upcomingRes) ? upcomingRes : (upcomingRes?.elections ?? []);
                        const myList = Array.isArray(myRes) ? myRes : (myRes?.elections ?? []);
                        setStats((prev) => ({
                            ...prev,
                            electionsAvailable: allList.length ?? prev.electionsAvailable,
                            upcomingElections: upcomingList.length ?? prev.upcomingElections,
                            myElections: myList.length ?? prev.myElections,
                            totalVotes: allList.reduce((s, e) => s + Number(e.totalVotes || 0), 0) || prev.totalVotes
                        }));
                        setOngoing(activeList || []);
                    }
                }

                // activities (optional endpoint)
                try {
                    const a = await api.get("/dashboard/activities?limit=5");
                    if (mounted && Array.isArray(a)) setActivities(a);
                } catch {
                    // fallback: empty
                    if (mounted) setActivities([]);
                }

                // ensure ongoing elections loaded (if not set by stats fallback)
                if (mounted && (!ongoing || ongoing.length === 0)) {
                    try {
                        const on = await electionService.getOngoingElections();
                        const onList = Array.isArray(on) ? on : (on?.elections ?? []);
                        setOngoing(onList || []);
                    } catch {
                        // ignore
                    }
                }
            } catch (err) {
                // no-op, keep placeholders
                console.error("Dashboard load error:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (isAuthenticated) load();

        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const roleLabel = isSuperAdmin ? "Admin" : isManager ? "Manager" : isAuthority ? "Authority" : isVoter ? "Voter" : "User";

    // Quick actions per role
    const quickActions = [
        ...(isVoter ? [{ label: "Browse Elections", to: "/elections" }, { label: "My Votes", to: "/my" }] : []),
        ...(isManager ? [{ label: "Create Election", to: "/create" }, { label: "Manage Candidates", to: "/candidates" }] : []),
        ...(isAuthority ? [{ label: "Register Voters", to: "/register-voters" }, { label: "Approve Candidates", to: "/candidates" }] : []),
        ...(isSuperAdmin ? [{ label: "Manage Users", to: "/admin/users" }, { label: "System Settings", to: "/admin" }] : [])
    ];

    // add election authority handler (manager-only)
    const handleAddElectionAuthority = async () => {
        try {
            const account = (window.prompt("Enter the wallet address to grant ELECTION_AUTHORITY:") || "").trim();
            if (!account) return;
            if (!/^0x[a-fA-F0-9]{40}$/.test(account)) {
                showError("Invalid Ethereum address");
                return;
            }
            // confirm action
            if (!window.confirm(`Grant ELECTION_AUTHORITY to ${account}?`)) return;

            const res = await api.post("/roles/election-authority", { account });
            showSuccess(res?.message || "Election authority added");
        } catch (err) {
            showError(err?.response?.data?.message || err?.message || "Failed to add election authority");
            console.error("addElectionAuthority error:", err);
        }
    };

    // add election manager handler (super-admin only)
    const handleAddElectionManager = async () => {
        try {
            const account = (window.prompt("Enter the wallet address to grant ELECTION_MANAGER:") || "").trim();
            if (!account) return;
            if (!/^0x[a-fA-F0-9]{40}$/.test(account)) {
                showError("Invalid Ethereum address");
                return;
            }
            if (!window.confirm(`Grant ELECTION_MANAGER to ${account}?`)) return;

            const res = await api.post("/roles/election-manager", { account });
            showSuccess(res?.message || "Election manager added");
        } catch (err) {
            showError(err?.response?.data?.message || err?.message || "Failed to add election manager");
            console.error("addElectionManager error:", err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
                    <div className="text-sm text-gray-600 mt-1">Role: <span className="inline-block px-2 py-1 rounded bg-gray-100 text-xs font-medium">{roleLabel}</span></div>
                </div>

                <div className="flex items-center gap-3">
                    {quickActions.map((a) => (
                        <Button key={a.label} variant="outline" size="small" onClick={() => { window.location.href = a.to; }}>
                            {a.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="text-sm text-gray-500">Elections Available</div>
                    <div className="text-2xl font-semibold mt-2">{loading ? "…" : stats.electionsAvailable}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-gray-500">Upcoming Elections</div>
                    <div className="text-2xl font-semibold mt-2">{loading ? "…" : stats.upcomingElections}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-gray-500">My Elections</div>
                    <div className="text-2xl font-semibold mt-2">{loading ? "…" : stats.myElections}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-gray-500">Total Votes</div>
                    <div className="text-2xl font-semibold mt-2">{loading ? "…" : stats.totalVotes}</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Ongoing Elections</h3>
                            <div className="text-xs text-gray-500">{(ongoing && ongoing.length) ? `${ongoing.length} active` : "No active elections"}</div>
                        </div>

                        <div className="mt-4">
                            <ElectionList elections={ongoing} isLoading={loading} showManageButtons={isManager || isSuperAdmin} />
                            <div className="mt-3 text-right">
                                <Button variant="outline" size="small" onClick={() => (window.location.href = "/elections")}>View All</Button>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-medium">Recent Activity</h3>
                        <div className="mt-3 space-y-2">
                            {loading ? (
                                <div className="text-sm text-gray-500">Loading...</div>
                            ) : activities.length === 0 ? (
                                <div className="text-sm text-gray-500">No recent activity</div>
                            ) : (
                                activities.slice(0, 5).map((a, i) => (
                                    <div key={i} className="flex items-start justify-between">
                                        <div>
                                            <div className="text-sm">{a.message || a.type || "Activity"}</div>
                                            <div className="text-xs text-gray-400">{a.time ? new Date(a.time).toLocaleString() : ""}</div>
                                        </div>
                                        <div className="text-xs text-gray-400">{a.meta?.actor ? a.meta.actor : ""}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                <aside className="space-y-4">
                    <Card>
                        <h3 className="text-sm font-medium">Quick Info</h3>
                        <div className="mt-3 grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">Pending Approvals</div>
                                <div className="font-medium">{loading ? "…" : stats.pendingApprovals}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">Total Candidates</div>
                                <div className="font-medium">{loading ? "…" : stats.totalCandidates}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">Registered Voters</div>
                                <div className="font-medium">{loading ? "…" : stats.totalVoters}</div>
                            </div>
                            {isSuperAdmin && (
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-500">Total Users</div>
                                    <div className="font-medium">{loading ? "…" : stats.totalUsers}</div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-medium">Quick Actions</h3>
                        <div className="mt-3 flex flex-col gap-2">
                            {isVoter && <Button variant="primary" size="small" onClick={() => (window.location.href = "/elections")}>Browse Elections</Button>}
                            {isManager && <Button variant="primary" size="small" onClick={() => (window.location.href = "/create")}>Create Election</Button>}
                            {isManager && <Button variant="outline" size="small" onClick={handleAddElectionAuthority}>Add Election Authority</Button>}
                            {/* Super admin-only action to add election manager */}
                            {isSuperAdmin && <Button variant="outline" size="small" onClick={handleAddElectionManager}>Add Election Manager</Button>}
                            {isAuthority && <Button variant="primary" size="small" onClick={() => (window.location.href = "/register-voters")}>Register Voters</Button>}
                            {isSuperAdmin && <Button variant="outline" size="small" onClick={() => (window.location.href = "/admin")}>Admin Panel</Button>}
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
