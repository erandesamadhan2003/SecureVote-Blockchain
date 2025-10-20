import React from 'react';
import { useElection, useUI } from '../../hooks';
import StatusBadge from './StatusBadge';

const ElectionCard = ({ election, onViewDetails, showActions = false }) => {
    const { changeElectionStatus } = useElection();
    const { showConfirmationModal, showSuccess, showError } = useUI();

    const {
        _id,
        electionId,
        name,
        description,
        startTime,
        endTime,
        status,
        totalVotes,
        totalCandidates,
        creatorAddress,
        isActive
    } = election;

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Truncate description
    const truncateDescription = (text, maxLength = 120) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Handle status change
    const handleStatusChange = async (newStatus) => {
        try {
            showConfirmationModal({
                title: `Change Election Status`,
                message: `Are you sure you want to change the election status to "${newStatus}"?`,
                confirmText: 'Change Status',
                cancelText: 'Cancel',
                onConfirm: async () => {
                    await changeElectionStatus(newStatus, election.contractAddress);
                    showSuccess('Status Updated', `Election status changed to ${newStatus}`);
                }
            });
        } catch (error) {
            showError('Status Change Failed', error.message);
        }
    };

    // Get next status action
    const getNextStatusAction = () => {
        const statusFlow = {
            'Created': { next: 'Registration', label: 'Start Registration', color: 'blue' },
            'Registration': { next: 'Voting', label: 'Start Voting', color: 'green' },
            'Voting': { next: 'Ended', label: 'End Election', color: 'red' },
            'Ended': { next: 'ResultDeclared', label: 'Declare Results', color: 'purple' },
            'ResultDeclared': null
        };

        return statusFlow[status];
    };

    const nextAction = getNextStatusAction();

    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{name}</h3>
                    <StatusBadge status={status} />
                </div>

                <p className="text-gray-600 text-sm leading-relaxed">
                    {truncateDescription(description)}
                </p>
            </div>

            {/* Election Details */}
            <div className="p-6 space-y-4">
                {/* Time Range */}
                <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatDate(startTime)} - {formatDate(endTime)}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-600">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{totalCandidates} Candidates</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{totalVotes} Votes</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                        onClick={() => onViewDetails?.(election)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm"
                    >
                        View Details
                    </button>

                    {showActions && nextAction && (
                        <button
                            onClick={() => handleStatusChange(nextAction.next)}
                            className={`bg-${nextAction.color}-600 hover:bg-${nextAction.color}-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm`}
                        >
                            {nextAction.label}
                        </button>
                    )}
                </div>

                {/* Creator Info (only for managers) */}
                {showActions && creatorAddress && (
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                        Created by: {creatorAddress.substring(0, 8)}...{creatorAddress.substring(creatorAddress.length - 6)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ElectionCard;