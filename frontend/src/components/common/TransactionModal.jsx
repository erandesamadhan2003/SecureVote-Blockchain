import React, { useEffect } from 'react';
import { useUI } from '../../hooks';

const TransactionModal = () => {
    const {
        modals: { transaction },
        hideTransactionModal
    } = useUI();

    const { isOpen, hash, status, message } = transaction;

    // Auto-close success modals after delay
    useEffect(() => {
        if (isOpen && status === 'success') {
            const timer = setTimeout(() => {
                hideTransactionModal();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isOpen, status, hideTransactionModal]);

    if (!isOpen) return null;

    // Status configuration
    const statusConfig = {
        pending: {
            icon: (
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            ),
            title: 'Transaction Pending',
            color: 'text-blue-600'
        },
        success: {
            icon: (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            ),
            title: 'Transaction Successful',
            color: 'text-green-600'
        },
        error: {
            icon: (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            ),
            title: 'Transaction Failed',
            color: 'text-red-600'
        }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        {config.icon}
                    </div>
                    <h3 className={`text-xl font-bold ${config.color} mb-2`}>
                        {config.title}
                    </h3>
                    {message && (
                        <p className="text-gray-600 text-sm">
                            {message}
                        </p>
                    )}
                </div>

                {/* Transaction Hash */}
                {hash && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Transaction Hash:</span>
                            <a
                                href={`https://sepolia.etherscan.io/tx/${hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                            >
                                <span>View on Explorer</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-2 break-all">
                            {hash}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-center">
                    {status === 'error' || status === 'success' ? (
                        <button
                            onClick={hideTransactionModal}
                            className={`${status === 'success'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                } text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200`}
                        >
                            {status === 'success' ? 'Continue' : 'Try Again'}
                        </button>
                    ) : (
                        <button
                            onClick={hideTransactionModal}
                            disabled
                            className="bg-gray-400 text-white px-6 py-2 rounded-lg font-medium cursor-not-allowed"
                        >
                            Processing...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionModal;