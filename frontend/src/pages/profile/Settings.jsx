import React, { useEffect, useState } from "react";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import api from "../../services/api.js";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Toggle } from "@/components/ui/toggle.jsx";

export default function Settings() {
    const { isAuthenticated } = useAuth();
    const { showSuccess, showError } = useToast();

    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        account: { name: "", email: "" },
        notifications: {
            electionUpdates: true,
            votingReminders: true,
            resultsAnnouncements: true,
            candidateApprovals: false,
            browserNotifications: false
        },
        privacy: {
            showVotingHistory: false,
            publicProfile: true,
            allowCandidateApplications: true
        },
        security: {
            enable2FA: false
        }
    });
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [passwordForDelete, setPasswordForDelete] = useState("");

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get("/user/settings").catch(() => null);
                if (res && mounted) {
                    setSettings((s) => ({ ...s, ...(res || {}) }));
                }
            } catch (err) {
                // ignore – endpoint optional
            } finally {
                if (mounted) setLoading(false);
            }
        };
        if (isAuthenticated) load();
        return () => { mounted = false; };
    }, [isAuthenticated]);

    const handleSaveSection = async (section) => {
        setIsSaving(true);
        try {
            const payload = settings[section] ? settings[section] : settings;
            await api.put(`/user/settings/${section === "account" ? "account" : section}`, payload);
            showSuccess("Settings saved");
        } catch (err) {
            showError(err?.message || "Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
        try {
            setIsSaving(true);
            await api.delete("/user/account", { data: { password: passwordForDelete } });
            showSuccess("Account deleted");
            // optional: redirect or logout
            window.location.href = "/";
        } catch (err) {
            showError(err?.message || "Account deletion failed");
        } finally {
            setIsSaving(false);
            setConfirmDeleteOpen(false);
            setPasswordForDelete("");
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Card>
                    <h2 className="text-lg font-semibold">Settings</h2>
                    <p className="mt-2 text-sm text-gray-600">Please login to manage your settings.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Settings</h1>
                <div className="text-sm text-gray-600">Manage your account and preferences</div>
            </div>

            <Card>
                <h3 className="text-lg font-medium">Account Settings</h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Name" value={settings.account.name || ""} onChange={(v) => setSettings(s => ({ ...s, account: { ...s.account, name: v } }))} />
                    <Input label="Email" value={settings.account.email || ""} onChange={(v) => setSettings(s => ({ ...s, account: { ...s.account, email: v } }))} />
                    <Textarea label="Profile bio" value={settings.account.bio || ""} onChange={(v) => setSettings(s => ({ ...s, account: { ...s.account, bio: v } }))} />
                </div>
                <div className="mt-3 flex gap-2">
                    <Button variant="primary" size="small" onClick={() => handleSaveSection("account")} loading={isSaving}>Save Account</Button>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-medium">Notification Preferences</h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Toggle label="Election updates" checked={!!settings.notifications.electionUpdates} onChange={(v) => setSettings(s => ({ ...s, notifications: { ...s.notifications, electionUpdates: v } }))} />
                    <Toggle label="Voting reminders" checked={!!settings.notifications.votingReminders} onChange={(v) => setSettings(s => ({ ...s, notifications: { ...s.notifications, votingReminders: v } }))} />
                    <Toggle label="Results announcements" checked={!!settings.notifications.resultsAnnouncements} onChange={(v) => setSettings(s => ({ ...s, notifications: { ...s.notifications, resultsAnnouncements: v } }))} />
                    <Toggle label="Candidate approvals (if authority)" checked={!!settings.notifications.candidateApprovals} onChange={(v) => setSettings(s => ({ ...s, notifications: { ...s.notifications, candidateApprovals: v } }))} />
                    <Toggle label="Browser notifications" checked={!!settings.notifications.browserNotifications} onChange={(v) => setSettings(s => ({ ...s, notifications: { ...s.notifications, browserNotifications: v } }))} />
                </div>
                <div className="mt-3 flex gap-2">
                    <Button variant="primary" size="small" onClick={() => handleSaveSection("notifications")} loading={isSaving}>Save Notifications</Button>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-medium">Privacy & Security</h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Toggle label="Show voting history" checked={!!settings.privacy.showVotingHistory} onChange={(v) => setSettings(s => ({ ...s, privacy: { ...s.privacy, showVotingHistory: v } }))} />
                    <Toggle label="Public profile" checked={!!settings.privacy.publicProfile} onChange={(v) => setSettings(s => ({ ...s, privacy: { ...s.privacy, publicProfile: v } }))} />
                    <Toggle label="Allow candidate applications" checked={!!settings.privacy.allowCandidateApplications} onChange={(v) => setSettings(s => ({ ...s, privacy: { ...s.privacy, allowCandidateApplications: v } }))} />
                    <Toggle label="Enable 2FA" checked={!!settings.security.enable2FA} onChange={(v) => setSettings(s => ({ ...s, security: { ...s.security, enable2FA: v } }))} />
                </div>
                <div className="mt-3 flex gap-2">
                    <Button variant="primary" size="small" onClick={() => handleSaveSection("privacy")} loading={isSaving}>Save Privacy & Security</Button>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                <div className="mt-3 text-sm text-gray-600">Deleting your account will remove your profile and associated data.</div>
                <div className="mt-4 flex gap-2">
                    <Button variant="danger" size="small" onClick={() => setConfirmDeleteOpen(true)}>Delete Account</Button>
                </div>
            </Card>

            <Modal isOpen={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} title="Confirm Account Deletion">
                <div className="space-y-3">
                    <div className="text-sm">Enter your password to confirm account deletion (if applicable).</div>
                    <Input label="Password" type="password" value={passwordForDelete} onChange={(v) => setPasswordForDelete(v)} />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="small" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
                        <Button variant="danger" size="small" onClick={handleDeleteAccount} loading={isSaving}>Delete</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
