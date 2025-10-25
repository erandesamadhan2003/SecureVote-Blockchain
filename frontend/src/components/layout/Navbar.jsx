import React, { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";
import ConnectWallet from "../common/ConnectWallet.jsx"; 
import Button from "../common/Button.jsx"; 
import LoginModal from "../auth/LoginModal.jsx"; 
import RegisterModal from "../auth/RegisterModal.jsx"; // added
import UserProfile from "../auth/UserProfile.jsx"; // added

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const [registerOpen, setRegisterOpen] = useState(false); // added
    const { user, walletAddress, isAuthenticated, wallet, isManager, isAuthority, isSuperAdmin, isVoter } = useAuth();

    const chainId = wallet?.chainId ?? null;

    // Theme colors
    const theme = {
        flax: "#F7E091",
        oldLace: "#F5EFE3",
        lightBlue: "#BAD4D3",
        aliceBlue: "#E5ECF2",
        silver: "#C3C5C4"
    };

    return (
        <header
            style={{ background: theme.aliceBlue }}
            className="sticky top-0 z-50 shadow-sm border-b"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-14 items-center">
                    {/* Left: Logo */}
                    <div className="flex items-center space-x-3">
                        <Link to="/" className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-md flex items-center justify-center"
                                style={{ background: theme.flax }}
                            >
                                <span className="font-bold text-sm" style={{ color: "#2b2b2b" }}>
                                    SV
                                </span>
                            </div>
                            <div>
                                <div className="text-sm font-semibold" style={{ color: "#243a3a" }}>
                                    SecureVote
                                </div>
                                <div className="text-xs" style={{ color: theme.silver }}>
                                    Decentralized Elections
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Center: Nav links (desktop) */}
                    <nav className="hidden md:flex space-x-4">
                        <Link to="/elections" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/40">
                            Elections
                        </Link>
                        {isAuthenticated && <Link to="/my" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/40">My Elections</Link>}
                        {(isManager || isSuperAdmin) && (
                            <Link to="/create" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/40">Create Election</Link>
                        )}
                        {(isManager || isAuthority || isSuperAdmin) && (
                            <Link to="/candidates" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/40">Candidates</Link>
                        )}
                        <Link to="/results" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/40">Results</Link>
                        {isSuperAdmin && (
                            <Link to="/admin" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/40">Admin</Link>
                        )}
                    </nav>

                    {/* Right: Network badge + Connect */}
                    <div className="flex items-center space-x-3">
                        <div
                            className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                                background: theme.lightBlue,
                                color: "#083233",
                                border: `1px solid ${theme.silver}`
                            }}
                            title={chainId ? `Connected to chain ${chainId}` : "Wallet not connected"}
                        >
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="#083233" strokeWidth="1.5"><circle cx="12" cy="12" r="9" stroke="#083233" /></svg>
                            {chainId ? `Chain ${chainId}` : "Not connected"}
                        </div>

                        {/* If authenticated show user profile dropdown, else show Login/Register */}
                        {isAuthenticated ? (
                          <>
                            {/* user profile dropdown */}
                            <UserProfile />
                          </>
                        ) : (
                          <>
                            <Button variant="secondary" size="small" onClick={() => setLoginOpen(true)}>
                              Login
                            </Button>
                            <Button variant="outline" size="small" onClick={() => setRegisterOpen(true)}>
                              Register
                            </Button>
                          </>
                        )}

                        {/* Connect Wallet component */}
                        <ConnectWallet />

                        {/* Mobile hamburger */}
                        <button
                            className="md:hidden ml-2 p-2 rounded-md hover:bg-white/40"
                            onClick={() => setMobileOpen((s) => !s)}
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#243a3a" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#243a3a" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t" style={{ background: theme.oldLace }}>
                    <div className="px-4 py-3 space-y-2">
                        <Link to="/elections" className="block px-2 py-2 rounded-md">Elections</Link>
                        {isAuthenticated && <Link to="/my" className="block px-2 py-2 rounded-md">My Elections</Link>}
                        {(isManager || isSuperAdmin) && <Link to="/create" className="block px-2 py-2 rounded-md">Create Election</Link>}
                        {(isManager || isAuthority || isSuperAdmin) && <Link to="/candidates" className="block px-2 py-2 rounded-md">Candidates</Link>}
                        <Link to="/results" className="block px-2 py-2 rounded-md">Results</Link>
                        {isSuperAdmin && <Link to="/admin" className="block px-2 py-2 rounded-md">Admin</Link>}
                        <div className="pt-2 border-t">
                            <div className="text-xs text-gray-600 px-2">Network: {chainId ?? "Not connected"}</div>
                            <div className="mt-2"><ConnectWallet /></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Login modal (pass handler so Login can open Register) */}
            <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onOpenRegister={() => { setLoginOpen(false); setRegisterOpen(true); }} />

            {/* Register modal */}
            <RegisterModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} onOpenLogin={() => { setRegisterOpen(false); setLoginOpen(true); }} />
        </header>
    );
}   
