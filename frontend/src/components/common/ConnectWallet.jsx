import React, { useState, useRef, useEffect } from "react";
import useWallet from "../../hooks/useWallet.js";
import useAuth from "../../hooks/useAuth.js";
import Button from "./Button.jsx";
import { NETWORK } from "../../utils/constants.js";

const truncate = (addr = "") => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "");

export default function ConnectWallet() {
	// wallet hook
	const { walletAddress, isConnected, isConnecting, balance, chainId, connect, disconnect, switchToSepolia } = useWallet();
	const { user, logout } = useAuth();

	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

	// close menu on outside click
	useEffect(() => {
		const onDoc = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
		};
		document.addEventListener("click", onDoc);
		return () => document.removeEventListener("click", onDoc);
	}, []);

	const handleConnect = async () => {
		await connect().catch(() => {});
	};

	const handleDisconnect = async () => {
		try {
			await logout(); // clear server/session
		} catch {
			/* ignore */
		}
		disconnect();
		setMenuOpen(false);
	};

	const handleCopy = async () => {
		if (!walletAddress) return;
		try {
			await navigator.clipboard.writeText(walletAddress);
		} catch {
			// fallback
		}
	};

	// MetaMask not installed
	if (typeof window === "undefined" || !window.ethereum) {
		return (
			<a
				href="https://metamask.io/download.html"
				target="_blank"
				rel="noreferrer"
			>
				<Button variant="outline" size="small">Install MetaMask</Button>
			</a>
		);
	}

	// Wrong network
	const wrongNetwork = chainId && NETWORK && NETWORK.SEPOLIA_CHAIN_ID && Number(chainId) !== Number(NETWORK.SEPOLIA_CHAIN_ID);

	if (wrongNetwork) {
		return (
			<div>
				<Button variant="secondary" size="small" onClick={() => switchToSepolia().catch(() => {})}>
					Switch to Sepolia
				</Button>
			</div>
		);
	}

	// Connecting
	if (isConnecting) {
		return <Button variant="primary" size="small" loading>Connecting...</Button>;
	}

	// Not connected
	if (!isConnected || !walletAddress) {
		return <Button variant="primary" size="small" onClick={handleConnect}>Connect Wallet</Button>;
	}

	// Connected
	return (
		<div className="relative inline-block" ref={menuRef}>
			<Button
				variant="outline"
				size="small"
				onClick={() => setMenuOpen((s) => !s)}
			>
				{/* wallet icon */}
				<svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
					<path d="M3 7h18v10H3z" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M7 11h.01" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
				{truncate(walletAddress)}
			</Button>

			{menuOpen && (
				<div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
					<div className="px-4 py-3 border-b">
						<div className="text-xs text-gray-500">Connected</div>
						<div className="flex items-center justify-between mt-2">
							<div className="text-sm font-medium">{truncate(walletAddress)}</div>
							<button onClick={handleCopy} className="text-xs text-blue-600">Copy</button>
						</div>
						<div className="text-xs text-gray-600 mt-1">Balance: {balance ?? "—"} ETH</div>
					</div>

					<div className="py-2">
						<a href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50">View Profile</a>
						<a href="/settings" className="block px-4 py-2 text-sm hover:bg-gray-50">Settings</a>
					</div>

					<div className="px-4 py-3 border-t">
						<Button variant="danger" size="small" onClick={handleDisconnect}>Disconnect</Button>
					</div>
				</div>
			)}
		</div>
	);
}
