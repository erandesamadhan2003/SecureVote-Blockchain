import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import useAuth from "../../hooks/useAuth.js";
import { selectSidebarOpen } from "../../redux/slices/uiSlice.js";
import {
    Home,
    FileText,
    User,
    Users,
    PlusCircle,
    Settings,
    LogOut,
    List,
    CheckSquare
} from "lucide-react";

/**
 * Props:
 * - isOpen: boolean (for mobile)
 * - onClose: function
 */
export default function Sidebar({ isOpen = false, onClose = () => { } }) {
    const { user, walletAddress, isAuthenticated, logout, isSuperAdmin, isManager, isAuthority, isVoter } = useAuth();
    const sidebarOpen = useSelector(selectSidebarOpen); // optional global control

    const theme = {
        flax: "#F7E091",
        oldLace: "#F5EFE3",
        lightBlue: "#BAD4D3",
        aliceBlue: "#E5ECF2",
        silver: "#C3C5C4"
    };

    const truncate = (addr = "") => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "");

    // build nav items based on role
    const common = [
        { to: "/", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
        { to: "/elections", label: "Elections", icon: <List className="w-4 h-4" /> },
        { to: "/profile", label: "Profile", icon: <User className="w-4 h-4" /> }
    ];

    const voterItems = [
        { to: "/dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
        { to: "/elections", label: "Elections", icon: <List className="w-4 h-4" /> },
        { to: "/my-votes", label: "My Votes", icon: <CheckSquare className="w-4 h-4" /> },
        { to: "/profile", label: "Profile", icon: <User className="w-4 h-4" /> }
    ];

    const managerItems = [
        { to: "/dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
        { to: "/my-elections", label: "My Elections", icon: <FileText className="w-4 h-4" /> },
        { to: "/create", label: "Create Election", icon: <PlusCircle className="w-4 h-4" /> },
        { to: "/candidates", label: "Candidates", icon: <Users className="w-4 h-4" /> },
        { to: "/voters", label: "Voters", icon: <Users className="w-4 h-4" /> },
        { to: "/profile", label: "Profile", icon: <User className="w-4 h-4" /> }
    ];

    const authorityItems = [
        { to: "/dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
        { to: "/elections", label: "Elections", icon: <List className="w-4 h-4" /> },
        { to: "/candidates", label: "Candidates", icon: <Users className="w-4 h-4" /> },
        { to: "/voters", label: "Voters", icon: <Users className="w-4 h-4" /> },
        { to: "/profile", label: "Profile", icon: <User className="w-4 h-4" /> }
    ];

    const adminItems = [
        { to: "/admin", label: "Admin Dashboard", icon: <Home className="w-4 h-4" /> },
        { to: "/admin/users", label: "Users", icon: <Users className="w-4 h-4" /> },
        { to: "/admin/elections", label: "Elections", icon: <FileText className="w-4 h-4" /> },
        { to: "/admin/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
        { to: "/profile", label: "Profile", icon: <User className="w-4 h-4" /> }
    ];

    let navItems = common;
    if (isSuperAdmin) navItems = adminItems;
    else if (isManager) navItems = managerItems;
    else if (isAuthority) navItems = authorityItems;
    else if (isVoter) navItems = voterItems;

    // responsive classes: visible on md as sidebar, on mobile render panel when isOpen true
    const containerCls = `fixed inset-y-0 left-0 z-40 w-64 transform bg-white border-r shadow-md transition-transform ${isOpen || sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:translate-x-0`;

    return (
        <aside style={{ background: theme.oldLace }} className={containerCls} aria-hidden={!(isOpen || sidebarOpen)}>
            <div className="flex flex-col h-full">
                {/* User info */}
                <div className="px-4 py-5 border-b flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: theme.flax }}>
                        <span className="font-bold text-sm" style={{ color: "#243a3a" }}>{(user && user.name) ? user.name[0].toUpperCase() : "U"}</span>
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">{user?.name || "Guest"}</div>
                        <div className="text-xs text-gray-600">{isAuthenticated ? truncate(walletAddress || "") : "Not connected"}</div>
                    </div>
                    {/* close for mobile */}
                    <button className="md:hidden p-1" onClick={onClose} aria-label="Close sidebar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="#243a3a" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-auto px-2 py-4">
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <li key={item.to}>
                                <Link
                                    to={item.to}
                                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/60 text-sm text-gray-800"
                                    onClick={() => { if (onClose) onClose(); }}
                                >
                                    <span className="text-gray-700">{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Bottom: logout */}
                <div className="px-4 py-4 border-t">
                    {isAuthenticated ? (
                        <button
                            onClick={() => { logout(); if (onClose) onClose(); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm">Logout</span>
                        </button>
                    ) : (
                        <Link to="/auth/login" className="w-full inline-flex items-center gap-3 px-3 py-2 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={onClose}>
                            <User className="w-4 h-4" />
                            <span className="text-sm">Login</span>
                        </Link>
                    )}
                </div>
            </div>
        </aside>
    );
}
