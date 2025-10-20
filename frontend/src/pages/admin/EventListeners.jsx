import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate, Link } from 'react-router-dom';
import { useElection } from '../../hooks/useElection';
import { useCandidates } from '../../hooks/useCandidates';
import { useUI } from '../../hooks/useUI';
import { useWallet } from '../../hooks/useWallet';

/**
 * Admin Event Listeners & Role tools
 * Route: /admin/event-listeners
 *
 * Relies on backend endpoints:
 * GET  /api/admin/roles
 * POST /api/admin/roles { address, role }
 * DELETE /api/admin/roles/:address
 * GET  /api/admin/roles/:address
 * POST /api/elections/:id/register-voters { addresses: [...] }
 *
 * Also connects to socket.io server for real-time events.
 */

const SOCKET_PATH = '/';

const EventListeners = () => {
  const navigate = useNavigate();
  const { account } = useWallet();
  const { showError, showSuccess, showInfo } = useUI();
  const { elections = [], loadElections, isElectionManager, isElectionAuthority, isSuperAdmin } = useElection();
  const allowed = useMemo(() => isSuperAdmin || isElectionManager || isElectionAuthority, [isSuperAdmin, isElectionManager, isElectionAuthority]);

  const [roleAddr, setRoleAddr] = useState('');
  const [roleValue, setRoleValue] = useState('VOTER');
  const [batchElectionId, setBatchElectionId] = useState('');
  const [batchText, setBatchText] = useState('');
  const [rolesList, setRolesList] = useState([]);
  const [queryAddr, setQueryAddr] = useState('');
  const [queriedRoles, setQueriedRoles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);

  const socketRef = useRef(null);
  const joinedRoomRef = useRef(null);

  useEffect(() => {
    (async () => {
      try { await loadElections(); } catch (e) { /* ignore */ }
      await fetchRoles();
    })();
    // connect socket once
    const socket = io(window.location.origin + SOCKET_PATH, { path: SOCKET_PATH });
    socketRef.current = socket;

    socket.on('connect', () => { showInfo?.('Socket connected'); });
    socket.on('disconnect', () => { showInfo?.('Socket disconnected'); });
    socket.on('vote-casted', (payload) => {
      showInfo?.('Vote cast', `Election ${payload?.electionId} • candidate ${payload?.candidateId}`);
    });
    socket.on('status-changed', (payload) => {
      showInfo?.('Election status changed', `${payload?.electionId}: ${payload?.status}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch('/api/admin/roles', { credentials: 'same-origin' });
      if (!res.ok) throw res;
      const data = await res.json();
      setRolesList(Array.isArray(data) ? data : []);
    } catch (err) {
      showError?.('Failed to load roles', err?.message || '');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!roleAddr || !/^0x[a-fA-F0-9]{40}$/.test(roleAddr.trim())) { showError?.('Invalid address'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: roleAddr.trim(), role: roleValue })
      });
      if (!res.ok) throw await res.json();
      setRoleAddr('');
      await fetchRoles();
      showSuccess?.('Role added');
    } catch (err) {
      showError?.('Add role failed', err?.message || '');
    } finally { setLoading(false); }
  };

  const handleRemoveRole = async (address) => {
    if (!confirm(`Remove roles for ${address}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/roles/${encodeURIComponent(address)}`, { method: 'DELETE' });
      if (!res.ok) throw await res.json();
      await fetchRoles();
      showSuccess?.('Role removed');
    } catch (err) {
      showError?.('Remove role failed', err?.message || '');
    } finally { setLoading(false); }
  };

  const handleBatchRegister = async (e) => {
    e.preventDefault();
    if (!batchElectionId) { showError?.('Select election'); return; }
    const lines = (batchText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { showError?.('No addresses'); return; }
    const invalid = lines.find(a => !/^0x[a-fA-F0-9]{40}$/.test(a));
    if (invalid) { showError?.('Invalid address', invalid); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/elections/${encodeURIComponent(batchElectionId)}/register-voters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: lines })
      });
      if (!res.ok) throw await res.json();
      showSuccess?.('Registered voters', `${lines.length} added`);
      setBatchText('');
    } catch (err) {
      showError?.('Batch register failed', err?.message || '');
    } finally { setLoading(false); }
  };

  const handleQueryRoles = async (e) => {
    e && e.preventDefault();
    if (!queryAddr || !/^0x[a-fA-F0-9]{40}$/.test(queryAddr.trim())) { showError?.('Invalid address'); return; }
    try {
      const res = await fetch(`/api/admin/roles/${encodeURIComponent(queryAddr.trim())}`);
      if (!res.ok) throw res;
      const data = await res.json();
      setQueriedRoles(data);
    } catch (err) {
      showError?.('Query failed', err?.message || '');
    }
  };

  const joinRoom = (electionId) => {
    if (!socketRef.current) return;
    if (joinedRoomRef.current) {
      socketRef.current.emit('leave', { room: `election-${joinedRoomRef.current}` });
      joinedRoomRef.current = null;
    }
    if (electionId) {
      socketRef.current.emit('join', { room: `election-${electionId}` });
      joinedRoomRef.current = electionId;
      showInfo?.('Joined room', `election-${electionId}`);
    }
  };

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border p-6 text-center">
          <h3 className="text-lg font-semibold">Access denied</h3>
          <p className="text-sm text-gray-600">Requires ElectionAuthority/Manager/SuperAdmin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded border">
          <h3 className="font-semibold mb-3">Add Role</h3>
          <form onSubmit={handleAddRole} className="space-y-2">
            <input value={roleAddr} onChange={(e) => setRoleAddr(e.target.value)} placeholder="0x..." className="w-full p-2 border rounded" />
            <select value={roleValue} onChange={(e) => setRoleValue(e.target.value)} className="w-full p-2 border rounded">
              <option value="VOTER">VOTER</option>
              <option value="ELECTION_AUTHORITY">ELECTION_AUTHORITY</option>
              <option value="ELECTION_MANAGER">ELECTION_MANAGER</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? '...' : 'Add Role'}</button>
            </div>
          </form>
        </div>

        <div className="bg-white p-4 rounded border">
          <h3 className="font-semibold mb-3">Add Voters (Batch)</h3>
          <form onSubmit={handleBatchRegister} className="space-y-2">
            <select value={batchElectionId} onChange={(e) => { setBatchElectionId(e.target.value); joinRoom(e.target.value); }} className="w-full p-2 border rounded">
              <option value="">-- select election --</option>
              {elections.map(el => <option key={el.electionId ?? el._id} value={el.electionId ?? el._id}>{el.name} — {el.status}</option>)}
            </select>
            <textarea value={batchText} onChange={(e) => setBatchText(e.target.value)} rows={6} className="w-full p-2 border rounded" placeholder="one address per line"></textarea>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={loading}>{loading ? '...' : 'Register'}</button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white p-4 rounded border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Roles</h3>
          <div><button onClick={fetchRoles} className="px-3 py-1 border rounded">Refresh</button></div>
        </div>

        {rolesLoading ? <div className="text-sm text-gray-500">Loading...</div> : (
          <div className="overflow-auto max-h-56">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-gray-500"><tr><th className="p-2 text-left">Address</th><th className="p-2 text-left">Roles</th><th className="p-2">Actions</th></tr></thead>
              <tbody>
                {rolesList.map(r => (
                  <tr key={r.address} className="border-t">
                    <td className="p-2 font-mono">{r.address}</td>
                    <td className="p-2">{(r.roles || []).join(', ')}</td>
                    <td className="p-2 text-right"><button onClick={() => handleRemoveRole(r.address)} className="px-2 py-1 bg-red-600 text-white rounded">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <form onSubmit={handleQueryRoles} className="col-span-2 flex gap-2">
            <input value={queryAddr} onChange={(e) => setQueryAddr(e.target.value)} placeholder="0x..." className="flex-1 p-2 border rounded" />
            <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Check Roles</button>
          </form>
          <div className="col-span-1">
            {queriedRoles ? <div className="text-sm"><div className="font-medium">{queriedRoles.address}</div><div className="mt-2">{(queriedRoles.roles||[]).join(', ') || '—'}</div></div> : <div className="text-sm text-gray-500">Enter address & click check</div>}
          </div>
        </div>
      </div>

      <div className="text-right">
        <Link to="/admin" className="text-sm text-gray-500">Back to admin</Link>
      </div>
    </div>
  );
};

export default EventListeners;