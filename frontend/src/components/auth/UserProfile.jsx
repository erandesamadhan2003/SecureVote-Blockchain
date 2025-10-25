import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";
import useWallet from "../../hooks/useWallet.js";
import Button from "../common/Button.jsx";

const truncate = (addr = "") => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "");

export default function UserProfile() {
  const { user, walletAddress, logout } = useAuth();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const handleCopy = async () => {
    const addr = walletAddress || wallet.walletAddress;
    if (!addr) return;
    try { await navigator.clipboard.writeText(addr); } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-white/40"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F7E091" }}>
          <span className="text-sm font-bold" style={{ color: "#243a3a" }}>{(user?.name || "U")[0].toUpperCase()}</span>
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-medium">{user?.name ?? "User"}</span>
          <span className="text-[11px] text-gray-600">{truncate(walletAddress || wallet.walletAddress || "")}</span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="px-4 py-3 border-b">
            <div className="text-sm font-semibold">{user?.name ?? "User"}</div>
            <div className="text-xs text-gray-600 mt-1 flex items-center justify-between">
              <span>{truncate(walletAddress || wallet.walletAddress || "")}</span>
              <button onClick={handleCopy} className="text-xs text-blue-600">Copy</button>
            </div>
            <div className="text-xs text-gray-500 mt-1">{user?.role ?? "Role: N/A"}</div>
          </div>

          <div className="py-1">
            <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50">View Profile</Link>
            <Link to="/settings" className="block px-4 py-2 text-sm hover:bg-gray-50">Settings</Link>
          </div>

          <div className="px-4 py-3 border-t">
            <Button variant="danger" size="small" onClick={() => { logout(); setOpen(false); }}>
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
