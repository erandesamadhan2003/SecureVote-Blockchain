import React, { useState, useEffect } from 'react';
import { useWallet, useUI } from '../../hooks';

const WalletConnect = () => {
    const {
        account,
        formattedAccount,
        isConnected,
        isCorrectNetwork,
        connectionStatus,
        loading,
        error,
        connect,
        disconnect,
        switchNetwork,
        clearErrors
    } = useWallet();

    const { showError, showSuccess } = useUI();
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        if (error) {
            showError('Wallet Error', error);
            clearErrors();
        }
    }, [error, showError, clearErrors]);

    const handleConnect = async () => {
        try {
            setIsConnecting(true);
            await connect();
            showSuccess('Wallet Connected', 'Your wallet has been connected successfully');
        } catch (error) {
            console.error('Connection failed:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await disconnect();
            showSuccess('Wallet Disconnected', 'Your wallet has been disconnected');
        } catch (error) {
            console.error('Disconnect failed:', error);
        }
    };

    const handleSwitchNetwork = async () => {
        try {
            await switchNetwork();
            showSuccess('Network Switched', 'Successfully switched to Sepolia Testnet');
        } catch (error) {
            showError('Network Switch Failed', error.message);
        }
    };

    // Connection status indicators
    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'bg-green-500';
            case 'wrong_network':
                return 'bg-yellow-500';
            case 'disconnected':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'Connected';
            case 'wrong_network':
                return 'Wrong Network';
            case 'disconnected':
                return 'Disconnected';
            default:
                return 'Unknown';
        }
    };

    if (!isConnected) {
        return (
            <div className="flex items-center space-x-4">
                <button
                    onClick={handleConnect}
                    disabled={isConnecting || loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                    {isConnecting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Connecting...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Connect Wallet</span>
                        </>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-4">
            {/* Network Status */}
            <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
                <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
            </div>

            {/* Network Switch Button */}
            {!isCorrectNetwork && (
                <button
                    onClick={handleSwitchNetwork}
                    disabled={loading}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                >
                    Switch Network
                </button>
            )}

            {/* Account Info */}
            <div className="flex items-center space-x-3 bg-gray-100 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-800">
                    {formattedAccount}
                </span>

                {/* Disconnect Button */}
                <button
                    onClick={handleDisconnect}
                    className="text-gray-500 hover:text-red-500 transition-colors duration-200 p-1 rounded"
                    title="Disconnect Wallet"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default WalletConnect;