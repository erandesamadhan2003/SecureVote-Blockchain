import { useState, useEffect, useCallback, useRef } from "react";
import { getProvider, getSigner, switchNetwork, getBalance, parseError } from "../utils/web3.js";

const isMetaMaskAvailable = () => typeof window !== "undefined" && !!window.ethereum;

export default function useWallet() {
    const [walletAddress, setWalletAddress] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [balance, setBalance] = useState(null);
    const [chainId, setChainId] = useState(null);

    const providerRef = useRef(null);

    const refreshProvider = useCallback(() => {
        providerRef.current = getProvider();
        return providerRef.current;
    }, []);

    const refreshBalance = useCallback(
        async (address) => {
            try {
                if (!address) {
                    setBalance(null);
                    return;
                }
                const val = await getBalance(address, providerRef.current);
                setBalance(val);
            } catch (err) {
                console.warn("refreshBalance:", parseError(err));
                setBalance(null);
            }
        },
        []
    );

    const handleAccountsChanged = useCallback(
        (accounts) => {
            if (!accounts || accounts.length === 0) {
                // disconnected
                setWalletAddress(null);
                setIsConnected(false);
                setBalance(null);
            } else {
                const addr = accounts[0];
                setWalletAddress(addr);
                setIsConnected(true);
                refreshBalance(addr);
            }
        },
        [refreshBalance]
    );

    const handleChainChanged = useCallback(
        (chainHex) => {
            try {
                const cid = parseInt(chainHex, 16);
                setChainId(cid);
                // refresh balance when chain changes
                if (walletAddress) refreshBalance(walletAddress);
            } catch (err) {
                console.warn("chainChanged parse error", err);
            }
        },
        [walletAddress, refreshBalance]
    );

    const connect = useCallback(async () => {
        if (!isMetaMaskAvailable()) throw new Error("MetaMask not available");
        setIsConnecting(true);
        try {
            const provider = refreshProvider();
            // request accounts
            const accounts = await provider.send("eth_requestAccounts", []);
            const addr = accounts && accounts[0] ? accounts[0] : null;
            if (!addr) throw new Error("No accounts returned");
            setWalletAddress(addr);
            setIsConnected(true);

            // signer and chain info
            const signer = getSigner(provider);
            try {
                const network = await provider.getNetwork();
                setChainId(network.chainId);
            } catch (e) { /* ignore */ }

            // balance
            await refreshBalance(addr);

            // attach listeners
            if (window.ethereum && window.ethereum.on) {
                window.ethereum.on("accountsChanged", handleAccountsChanged);
                window.ethereum.on("chainChanged", handleChainChanged);
            }

            return { address: addr };
        } catch (err) {
            const msg = parseError(err);
            throw new Error(msg);
        } finally {
            setIsConnecting(false);
        }
    }, [refreshProvider, refreshBalance, handleAccountsChanged, handleChainChanged]);

    const disconnect = useCallback(() => {
        setWalletAddress(null);
        setIsConnected(false);
        setBalance(null);
        setChainId(null);
        // remove listeners
        if (window.ethereum && window.ethereum.removeListener) {
            try {
                window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
                window.ethereum.removeListener("chainChanged", handleChainChanged);
            } catch (e) {
                /* ignore */
            }
        }
    }, [handleAccountsChanged, handleChainChanged]);

    const switchToSepolia = useCallback(async () => {
        try {
            const result = await switchNetwork(); // defaults to Sepolia in web3.js
            if (!result.success) throw new Error(result.error || "Switch network failed");
            // after switching, refresh provider/network info
            const provider = refreshProvider();
            const network = await provider.getNetwork();
            setChainId(network.chainId);
            if (walletAddress) await refreshBalance(walletAddress);
            return result;
        } catch (err) {
            throw new Error(parseError(err));
        }
    }, [refreshProvider, refreshBalance, walletAddress]);

    useEffect(() => {
        // init provider and current connection state (if accounts already connected)
        const init = async () => {
            if (!isMetaMaskAvailable()) return;
            const provider = refreshProvider();
            try {
                const accounts = await provider.listAccounts();
                if (accounts && accounts.length > 0) {
                    handleAccountsChanged(accounts);
                }
                const network = await provider.getNetwork();
                setChainId(network.chainId);
            } catch (e) {
                // ignore
            }
            // attach listeners
            if (window.ethereum && window.ethereum.on) {
                window.ethereum.on("accountsChanged", handleAccountsChanged);
                window.ethereum.on("chainChanged", handleChainChanged);
            }
        };
        init();

        return () => {
            if (window.ethereum && window.ethereum.removeListener) {
                try {
                    window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
                    window.ethereum.removeListener("chainChanged", handleChainChanged);
                } catch (e) {
                    /* ignore */
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once

    return {
        walletAddress,
        isConnected,
        isConnecting,
        balance,
        chainId,
        connect,
        disconnect,
        switchToSepolia
    };
}