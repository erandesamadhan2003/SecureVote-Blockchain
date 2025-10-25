import { useMemo, useState, useCallback, useEffect } from "react";
import { getProvider, getContract, parseError } from "../utils/web3.js";
import useWallet from "./useWallet.js";

/**
 * useContract(contractAddress, contractABI)
 * - returns { contract, callMethod, sendTransaction, isLoading, error }
 */
export default function useContract(contractAddress, contractABI) {
    const { walletAddress, isConnected } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // provider (either injected or fallback)
    const provider = useMemo(() => getProvider(), []);

    // contract instance memoized; if connected, create with signer so write methods available
    const contract = useMemo(() => {
        if (!contractAddress || !contractABI) return null;
        try {
            // withSigner = isConnected so contract.connects to signer when wallet connected
            return getContract(contractAddress, contractABI, { withSigner: !!isConnected, provider });
        } catch (err) {
            console.warn("useContract: failed to create contract", err);
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contractAddress, contractABI, isConnected, provider]);

    useEffect(() => {
        // clear error when contract or address changes
        setError(null);
    }, [contractAddress, contractABI, isConnected]);

    const callMethod = useCallback(
        async (methodName, ...params) => {
            if (!contract) throw new Error("Contract not initialized");
            setIsLoading(true);
            setError(null);
            try {
                if (typeof contract[methodName] !== "function") throw new Error("Method not found on contract");
                const res = await contract[methodName](...params);
                setIsLoading(false);
                return res;
            } catch (err) {
                const msg = parseError(err);
                setError(msg);
                setIsLoading(false);
                throw new Error(msg);
            }
        },
        [contract]
    );

    const sendTransaction = useCallback(
        async (methodName, ...params) => {
            if (!contract) throw new Error("Contract not initialized");
            setIsLoading(true);
            setError(null);
            try {
                // Ensure contract is connected to a signer for write operations
                // getContract was created with signer when isConnected true; otherwise warn
                if (!isConnected) throw new Error("Wallet not connected");
                if (typeof contract[methodName] !== "function") throw new Error("Method not found on contract");
                const tx = await contract[methodName](...params);
                const receipt = await tx.wait();
                setIsLoading(false);
                return receipt;
            } catch (err) {
                const msg = parseError(err);
                setError(msg);
                setIsLoading(false);
                throw new Error(msg);
            }
        },
        [contract, isConnected]
    );

    return {
        contract,
        callMethod,
        sendTransaction,
        isLoading,
        error
    };
}
