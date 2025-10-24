import { ethers } from "ethers";
import { NETWORK } from "./constants.js";

const toHexChainId = (chainId) => {
    const n = Number(chainId || NETWORK.SEPOLIA_CHAIN_ID);
    return "0x" + n.toString(16);
};

export const getProvider = () => {
    if (typeof window !== "undefined" && window.ethereum) {
        return new ethers.providers.Web3Provider(window.ethereum);
    }
    return new ethers.providers.JsonRpcProvider(NETWORK.RPC_URL);
};

export const getSigner = (provider = null) => {
    const p = provider || getProvider();
    try {
        return p.getSigner();
    } catch {
        return null;
    }
};

export const getContract = (address, abi, { withSigner = false, provider = null } = {}) => {
    if (!address || !abi) throw new Error("address and abi required");
    const p = provider || getProvider();
    const signerOrProvider = withSigner ? getSigner(p) : p;
    return new ethers.Contract(address, abi, signerOrProvider);
};

export const switchNetwork = async (chainId = NETWORK.SEPOLIA_CHAIN_ID) => {
    if (!window || !window.ethereum) throw new Error("No wallet found");
    const hexChainId = toHexChainId(chainId);
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: hexChainId }]
        });
        return { success: true };
    } catch (err) {
        // 4902 = chain not added to wallet
        if (err.code === 4902 || (err?.data?.originalError?.code === 4902)) {
            // Attempt to add Sepolia
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [
                        {
                            chainId: hexChainId,
                            chainName: "Sepolia",
                            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                            rpcUrls: [NETWORK.RPC_URL],
                            blockExplorerUrls: [import.meta.env.VITE_ETHERSCAN_URL || "https://sepolia.etherscan.io"]
                        }
                    ]
                });
                return { success: true, added: true };
            } catch (addErr) {
                return { success: false, error: parseError(addErr) };
            }
        }
        return { success: false, error: parseError(err) };
    }
};

export const getBalance = async (address, provider = null) => {
    const p = provider || getProvider();
    const balance = await p.getBalance(address);
    return ethers.utils.formatEther(balance);
};

export const waitForTransaction = async (txHash, confirmations = 1, provider = null) => {
    const p = provider || getProvider();
    return p.waitForTransaction(txHash, confirmations);
};

export const parseError = (error) => {
    if (!error) return "Unknown error";
    // ethers revert reason
    if (error.error && error.error.message) return error.error.message;
    if (error.data && error.data.message) return error.data.message;
    if (error.reason) return error.reason;
    if (typeof error === "string") return error;
    if (error.message) {
        // common patterns
        const msg = error.message;
        if (msg.includes("insufficient funds")) return "Insufficient funds for transaction";
        if (msg.includes("CALL_EXCEPTION") || msg.includes("revert")) {
            // try to extract revert reason
            const match = msg.match(/revert(?:\s|:)?\s*(.*)/i);
            return match ? match[1] : "Contract call failed";
        }
        return msg;
    }
    return "Blockchain error";
};

export default {
    getProvider,
    getSigner,
    getContract,
    switchNetwork,
    getBalance,
    waitForTransaction,
    parseError
};
