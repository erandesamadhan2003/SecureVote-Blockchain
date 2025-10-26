import React, { useEffect, useMemo, useState } from "react";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import api from "../../services/api.js";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";

/**
 * Admin User Management Page
 * Route: /admin/users
 */
export default function UserManagementPage() {
    const { isSuperAdmin } = useAuth();
    const { showSuccess, showError } = useToast();

    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({ q: "", role: "all", verified: "all" });
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);

    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");

    // modals
    const [editUser, setEditUser] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [bulkRole, setBulkRole] = useState("");

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = {
                q: filters.q || undefined,
                role: filters.role && filters.role !== "all" ? filters.role : undefined,
                verified: filters.verified && filters.verified !== "all" ? filters.verified : undefined,
                page,
                limit,
                sortBy,
                sortOrder
            };
            const res = await api.get("/admin/users", { params }).catch((e) => { throw e; });
            // backend may return { users, total }
            const data = res?.users ?? res?.data ?? res;
            const list = Array.isArray(data) ? data : data?.users ?? [];
            setUsers(list);
            setTotal(res?.total ?? res?.count ?? list.length);
        } catch (err) {
            console.error(err);
            showError(err?.message || "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isSuperAdmin) return;
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuperAdmin, page, sortBy, sortOrder]);

    const applyFilters = () => {
        setPage(1);
        fetchUsers();
    };

    const clearFilters = () => {
        setFilters({ q: "", role: "all", verified: "all" });
        setPage(1);
        fetchUsers();
    };

    const toggleSelect = (id) => {
        setSelected((s) => {
            const copy = new Set(s);
            if (copy.has(id)) copy.delete(id);
            else copy.add(id);
            return copy;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === users.length) {
            setSelected(new Set());
            return;
        }
        setSelected(new Set(users.map((u) => u._id ?? u.id)));
    };

    const changeRole = async (userId, role) => {
        try {
            setLoading(true);
            await api.put(`/admin/users/${userId}/role`, { role });
            showSuccess("Role updated");
            fetchUsers();
        } catch (err) {
            showError(err?.message || "Failed to update role");
        } finally {
            setLoading(false);
        }
    };

    const toggleVerify = async (userId, verify) => {
        try {
            setLoading(true);
            await api.put(`/admin/users/${userId}/verify`, { verify });
            showSuccess(verify ? "User verified" : "User unverified");
            fetchUsers();
        } catch (err) {
            showError(err?.message || "Failed to update verification");
        } finally {
            setLoading(false);
        }
    };

    const doDelete = async (userId) => {
        try {
            setLoading(true);
            await api.delete(`/admin/users/${userId}`);
            showSuccess("User deleted");
            setConfirmDelete(null);
            fetchUsers();
        } catch (err) {
            showError(err?.message || "Failed to delete user");
        } finally {
            setLoading(false);
        }
    };

    const bulkAssignRole = async () => {
        if (!bulkRole || selected.size === 0) return showError("Select role and users");
        try {
            setLoading(true);
            const ids = Array.from(selected);
            await api.post("/admin/users/bulk-action", { action: "assignRole", role: bulkRole, users: ids });
            showSuccess("Bulk role assignment submitted");
            setSelected(new Set());
            setBulkRole("");
            fetchUsers();
        } catch (err) {
            showError(err?.message || "Bulk action failed");
        } finally {
            setLoading(false);
        }
    };

    const bulkVerify = async (verify = true) => {
        if (selected.size === 0) return showError("Select users first");
        try {
            setLoading(true);
            const ids = Array.from(selected);
            await api.post("/admin/users/bulk-action", { action: "verify", verify, users: ids });
            showSuccess(`Bulk ${verify ? "verify" : "unverify"} completed`);
            setSelected(new Set());
            fetchUsers();
        } catch (err) {
            showError(err?.message || "Bulk verify failed");
        } finally {
            setLoading(false);
        }
    };

    const bulkDelete = async () => {
        if (selected.size === 0) return showError("Select users first");
        if (!window.confirm(`Delete ${selected.size} users? This cannot be undone.`)) return;
        try {
            setLoading(true);
            const ids = Array.from(selected);
            await api.post("/admin/users/bulk-action", { action: "delete", users: ids });
            showSuccess("Bulk delete completed");
            setSelected(new Set());
            fetchUsers();
        } catch (err) {
            showError(err?.message || "Bulk delete failed");
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const rows = [
            ["Name", "Wallet", "Email", "Role", "Verified"]
        ];
        users.forEach((u) => {
            rows.push([u.name || "", u.walletAddress || "", u.email || "", u.role || "", u.isVerified ? "Yes" : "No"]);
        });
        const csv = rows.map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `users_export_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSort = (col) => {
        if (sortBy === col) setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
        else {
            setSortBy(col);
            setSortOrder("asc");
        }
        // refetch after sort change
        setTimeout(fetchUsers, 0);
    };

    if (!isSuperAdmin) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Card>
                    <h2 className="text-lg font-semibold">User Management</h2>
                    <p className="mt-2 text-sm text-gray-600">You do not have permission to view this page.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">User Management</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="small" onClick={() => { setFilters({ q: "", role: "all", verified: "all" }); fetchUsers(); }}>Refresh</Button>
                    <Button variant="primary" size="small" onClick={() => exportCSV()}>Export CSV</Button>
                </div>
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="text-xs block">Search</label>
                        <input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} className="w-full px-2 py-1 border rounded" placeholder="Name, email or wallet" />
                    </div>
                    <div>
                        <label className="text-xs block">Role</label>
                        <select value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))} className="w-full px-2 py-1 border rounded">
                            <option value="all">All</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="ELECTION_MANAGER">Manager</option>
                            <option value="ELECTION_AUTHORITY">Authority</option>
                            <option value="VOTER">Voter</option>
                            <option value="USER">User</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs block">Verified</label>
                        <select value={filters.verified} onChange={(e) => setFilters((f) => ({ ...f, verified: e.target.value }))} className="w-full px-2 py-1 border rounded">
                            <option value="all">All</option>
                            <option value="true">Verified</option>
                            <option value="false">Not Verified</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="primary" size="small" onClick={applyFilters}>Apply</Button>
                        <Button variant="outline" size="small" onClick={clearFilters}>Clear</Button>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-gray-600">Total users: <strong>{total}</strong></div>

                    <div className="flex items-center gap-2">
                        <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} className="px-2 py-1 border rounded text-sm">
                            <option value="">Bulk role...</option>
                            <option value="ELECTION_MANAGER">Manager</option>
                            <option value="ELECTION_AUTHORITY">Authority</option>
                            <option value="VOTER">Voter</option>
                            <option value="USER">User</option>
                        </select>
                        <Button variant="outline" size="small" onClick={bulkAssignRole}>Assign Role</Button>
                        <Button variant="primary" size="small" onClick={() => bulkVerify(true)}>Verify Selected</Button>
                        <Button variant="danger" size="small" onClick={bulkDelete}>Delete Selected</Button>
                    </div>
                </div>

                <div className="overflow-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2"><input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleSelectAll} /></th>
                                <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleSort("name")}>Name</th>
                                <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleSort("walletAddress")}>Wallet</th>
                                <th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleSort("role")}>Role</th>
                                <th className="px-3 py-2 text-left">Verified</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="p-6 text-center text-sm text-gray-600">Loading...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="7" className="p-6 text-center text-sm text-gray-600">No users found</td></tr>
                            ) : users.map((u) => {
                                const id = u._id ?? u.id;
                                const checked = selected.has(id);
                                return (
                                    <tr key={id} className="border-b">
                                        <td className="px-3 py-3"><input type="checkbox" checked={checked} onChange={() => toggleSelect(id)} /></td>
                                        <td className="px-3 py-3">
                                            <div className="font-medium">{u.name || "—"}</div>
                                            <div className="text-xs text-gray-500">{u.username ?? ""}</div>
                                        </td>
                                        <td className="px-3 py-3 font-mono text-xs">{u.walletAddress || "—"}</td>
                                        <td className="px-3 py-3 text-sm">{u.email || "—"}</td>
                                        <td className="px-3 py-3 text-sm">{u.role || "USER"}</td>
                                        <td className="px-3 py-3 text-sm">{u.isVerified ? "Yes" : "No"}</td>
                                        <td className="px-3 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="small" onClick={() => setEditUser(u)}>Edit</Button>
                                                <Button variant="outline" size="small" onClick={() => toggleVerify(id, !u.isVerified)}>{u.isVerified ? "Unverify" : "Verify"}</Button>
                                                <Button variant="danger" size="small" onClick={() => setConfirmDelete(u)}>Delete</Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* pagination */}
                <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600">Showing {users.length} of {total}</div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="small" onClick={() => { if (page > 1) setPage((p) => p - 1); }}>Previous</Button>
                        <div className="text-sm">Page {page}</div>
                        <Button variant="outline" size="small" onClick={() => setPage((p) => p + 1)}>Next</Button>
                    </div>
                </div>
            </Card>

            {/* Edit Role Modal */}
            <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User Role">
                {editUser && (
                    <div className="space-y-3">
                        <div><strong>{editUser.name}</strong></div>
                        <div>
                            <label className="text-xs block">Role</label>
                            <select defaultValue={editUser.role || "USER"} className="w-full px-2 py-1 border rounded" onChange={(e) => setEditUser((u) => ({ ...u, role: e.target.value }))}>
                                <option value="USER">User</option>
                                <option value="VOTER">Voter</option>
                                <option value="ELECTION_AUTHORITY">Authority</option>
                                <option value="ELECTION_MANAGER">Manager</option>
                                <option value="SUPER_ADMIN">Admin</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="small" onClick={() => setEditUser(null)}>Cancel</Button>
                            <Button variant="primary" size="small" onClick={async () => { await changeRole(editUser._id ?? editUser.id, editUser.role); setEditUser(null); }}>Save</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete confirm */}
            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Delete">
                {confirmDelete && (
                    <div className="space-y-3">
                        <div>Are you sure you want to delete <strong>{confirmDelete.name}</strong> ({confirmDelete.email || confirmDelete.walletAddress})?</div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="small" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                            <Button variant="danger" size="small" onClick={async () => { await doDelete(confirmDelete._id ?? confirmDelete.id); }}>Delete</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
