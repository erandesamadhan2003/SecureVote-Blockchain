import { initProvider, checkNetwork, switchToSepolia } from './contractHelper';

// Web3 provider singleton
let web3Provider = null;

// Initialize and get web3 provider
export const getWeb3Provider = async () => {
    if (!web3Provider) {
        web3Provider = initProvider();
    }
    return web3Provider;
};

// Check and ensure correct network
export const ensureCorrectNetwork = async () => {
    try {
        const provider = await getWeb3Provider();
        const networkInfo = await checkNetwork(provider);

        if (!networkInfo.isCorrectNetwork) {
            await switchToSepolia();
            // Re-check network after switching
            return await checkNetwork(provider);
        }

        return networkInfo;
    } catch (error) {
        console.error('Error ensuring correct network:', error);
        throw error;
    }
};

// Get signer from provider
export const getSigner = async () => {
    const provider = await getWeb3Provider();
    return await provider.getSigner();
};

// Get current account
export const getCurrentAccount = async () => {
    try {
        const provider = await getWeb3Provider();
        const accounts = await provider.send('eth_requestAccounts', []);
        return accounts[0] || null;
    } catch (error) {
        console.error('Error getting current account:', error);
        return null;
    }
};

// Listen for account changes
export const onAccountsChanged = (callback) => {
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            callback(accounts[0] || null);
        });
    }
};

// Listen for network changes
export const onChainChanged = (callback) => {
    if (window.ethereum) {
        window.ethereum.on('chainChanged', (chainId) => {
            callback(Number(chainId));
        });
    }
};

// Remove event listeners
export const removeListeners = () => {
    if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
    }
};

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
    return !!window.ethereum;
};

// Get MetaMask provider
export const getMetaMaskProvider = () => {
    return window.ethereum;
};