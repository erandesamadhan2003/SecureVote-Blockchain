import React, { useEffect, useState } from "react";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import useAuth from "../../hooks/useAuth.js";
import useWallet from "../../hooks/useWallet.js";
import api from "../../services/api.js";
import useToast from "../../hooks/useToast.js";
import { formatDate, formatNumber } from "../../utils/helpers.js";
import { Input } from "@/components/ui/input.jsx";

export default function ProfilePage() {
    const { user: authUser, isAuthenticated, fetchUserProfile } = useAuth(); // fetchUserProfile may be available via hook state; otherwise we use local fetch
    const wallet = useWallet();
    const { showSuccess, showError } = useToast();

    const [user, setUser] = useState(authUser ?? null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ name: "", email: "" });
    const [stats, setStats] = useState({
        electionsParticipated: "—",
        votesCast: "—",
        upcomingElections: "—",
        electionsCreated: "—",
        totalCandidates: "—",
        totalVoters: "—",
        electionsContested: "—",
        votesReceived: "—",
        wins: "—",
        losses: "—"
    });
    const [activities, setActivities] = useState([]);
    const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                // prefer auth user from redux/hook
                let profile = authUser;
                if (!profile) {
                    const res = await api.get("/auth/profile").catch(() => null);
                    profile = res?.user ?? res ?? null;
                }
                if (!mounted) return;
                setUser(profile);
                setForm({ name: profile?.name || "", email: profile?.email || "" });
            } catch (err) {
                showError("Failed to load profile");
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        const loadStats = async () => {
            try {
                const res = await api.get("/user/stats").catch(() => null);
                if (res) {
                    setStats((s) => ({ ...s, ...(res || {}) }));
                    return;
                }
                // best-effort fallbacks (no-op if endpoints missing)
            } catch (e) { /* ignore */ }
        };

        const loadActivities = async () => {
            try {
                const res = await api.get("/user/activities?limit=10").catch(() => null);
                if (res && Array.isArray(res)) setActivities(res);
                else if (res?.activities) setActivities(res.activities);
            } catch (e) { /* ignore */ }
        };

        if (isAuthenticated) {
            loadProfile();
            loadStats();
            loadActivities();
        }

        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const startEdit = () => setIsEditing(true);
    const cancelEdit = () => {
        setIsEditing(false);
        setForm({ name: user?.name || "", email: user?.email || "" });
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const payload = { name: form.name, email: form.email };
            const res = await api.put("/auth/profile", payload);
            const updated = res?.user ?? res ?? payload;
            setUser(updated);
            setIsEditing(false);
            showSuccess("Profile updated");
            // try refresh global profile if hook supports
            if (typeof fetchUserProfile === "function") fetchUserProfile();
        } catch (err) {
            showError(err?.message || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setConfirmDisconnectOpen(false);
        try {
            // no server logout required; clear client-side wallet connection
            // call hook's disconnect if available
            if (wallet && wallet.disconnect) wallet.disconnect();
            showSuccess("Wallet disconnected");
        } catch (e) {
            showError("Failed to disconnect wallet");
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Card>
                    <h2 className="text-lg font-semibold">Profile</h2>
                    <div className="mt-3 text-sm text-gray-600">Please connect your wallet / login to view profile.</div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold">
                            {user?.name ? user.name[0].toUpperCase() : (wallet.walletAddress ? wallet.walletAddress[2]?.toUpperCase() : "U")}
                        </div>

                        {!isEditing ? (
                            <>
                                <h3 className="mt-3 text-xl font-semibold">{user?.name || "Unnamed"}</h3>
                                <div className="text-sm text-gray-500 mt-1">{user?.role || "User"}</div>
                                <div className="mt-2 text-xs text-gray-400">Member since {user?.createdAt ? formatDate(user.createdAt) : "—"}</div>

                                <div className="mt-4 w-full space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <div>Wallet</div>
                                        <div className="font-mono">{wallet.walletAddress || user?.walletAddress || "Not connected"}</div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>Verified</div>
                                        <div className={`px-2 py-1 rounded text-xs ${user?.isVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{user?.isVerified ? "Verified" : "Unverified"}</div>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <Button variant="outline" size="small" onClick={startEdit}>Edit Profile</Button>
                                    <Button variant="outline" size="small" onClick={() => setConfirmDisconnectOpen(true)}>Disconnect Wallet</Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Input label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
                                <Input label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
                                <div className="mt-3 flex gap-2">
                                    <Button variant="primary" size="small" onClick={handleSave} loading={isLoading}>Save</Button>
                                    <Button variant="outline" size="small" onClick={cancelEdit}>Cancel</Button>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <h3 className="text-lg font-semibold">Statistics</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                            <div className="p-3 bg-gray-50 rounded text-center">
                                <div className="text-xs text-gray-500">Elections Participated</div>
                                <div className="text-xl font-semibold mt-1">{stats.electionsParticipated ?? "—"}</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded text-center">
                                <div className="text-xs text-gray-500">Votes Cast</div>
                                <div className="text-xl font-semibold mt-1">{stats.votesCast ?? "—"}</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded text-center">
                                <div className="text-xs text-gray-500">Elections Created</div>
                                <div className="text-xl font-semibold mt-1">{stats.electionsCreated ?? "—"}</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded text-center">
                                <div className="text-xs text-gray-500">Total Votes Received</div>
                                <div className="text-xl font-semibold mt-1">{stats.votesReceived ?? "—"}</div>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Recent Activity</h3>
                            <div className="text-xs text-gray-500">Last {activities.length}</div>
                        </div>

                        <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                            {activities.length === 0 ? (
                                <div className="text-sm text-gray-500">No recent activity</div>
                            ) : (
                                activities.map((a, i) => (
                                    <div key={i} className="flex items-start justify-between">
                                        <div>
                                            <div className="text-sm">{a.action || a.message || "Activity"}</div>
                                            <div className="text-xs text-gray-400">{a.time ? new Date(a.time).toLocaleString() : ""}</div>
                                        </div>
                                        <div className="text-xs text-gray-400">{a.electionName || a.related || ""}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-semibold">Connected Wallet</h3>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <div className="text-xs text-gray-500">Address</div>
                                <div className="font-mono mt-1">{wallet.walletAddress || user?.walletAddress || "Not connected"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Network</div>
                                <div className="mt-1">{wallet.chainId ? `Chain ${wallet.chainId}` : "—"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Balance</div>
                                <div className="mt-1">{wallet.balance ? `${wallet.balance} ETH` : "—"}</div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Button variant="outline" size="small" onClick={() => setConfirmDisconnectOpen(true)}>Disconnect</Button>
                        </div>
                    </Card>
                </div>
            </div>

            <Modal isOpen={confirmDisconnectOpen} onClose={() => setConfirmDisconnectOpen(false)} title="Disconnect Wallet">
                <div className="space-y-3">
                    <div>Are you sure you want to disconnect your wallet from this application?</div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="small" onClick={() => setConfirmDisconnectOpen(false)}>Cancel</Button>
                        <Button variant="danger" size="small" onClick={handleDisconnect}>Disconnect</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
