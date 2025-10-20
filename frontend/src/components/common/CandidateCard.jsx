import React, { useState } from 'react';
import { useCandidates, useUI, useWallet } from '../../hooks';

const CandidateCard = ({ 
  candidate, 
  election, 
  showVoteButton = false, 
  showValidateButton = false,
  onVote,
  onValidate 
}) => {
  const { account } = useWallet();
  const { validateCandidate } = useCandidates();
  const { showConfirmationModal, showSuccess, showError } = useUI();
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    candidateId,
    name,
    party,
    manifesto,
    imageUrl,
    imageHash,
    voteCount,
    status,
    candidateAddress
  } = candidate;

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };

  // Handle vote
  const handleVote = () => {
    showConfirmationModal({
      title: 'Confirm Your Vote',
      message: `Are you sure you want to vote for ${name} (${party})? This action cannot be undone.`,
      confirmText: 'Yes, Vote Now',
      cancelText: 'Cancel',
      onConfirm: () => onVote?.(candidateId)
    });
  };

  // Handle candidate validation (approve/reject)
  const handleValidate = (approved) => {
    const action = approved ? 'approve' : 'reject';
    
    showConfirmationModal({
      title: `${approved ? 'Approve' : 'Reject'} Candidate`,
      message: `Are you sure you want to ${action} ${name} as a candidate?`,
      confirmText: `Yes, ${action}`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await validateCandidate(candidateId, approved, election?.contractAddress);
          onValidate?.(candidateId, approved);
          showSuccess(
            `Candidate ${approved ? 'Approved' : 'Rejected'}`,
            `${name} has been ${approved ? 'approved' : 'rejected'} as a candidate`
          );
        } catch (error) {
          showError('Validation Failed', error.message);
        }
      }
    });
  };

  // Check if user is the candidate
  const isUserCandidate = account && candidateAddress?.toLowerCase() === account.toLowerCase();

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Truncate manifesto for collapsed view
  const truncateManifesto = (text, maxLength = 150) => {
    if (!text) return 'No manifesto provided.';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-4 mb-4">
          {/* Candidate Image */}
          <div className="flex-shrink-0">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                onError={handleImageError}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Candidate Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900 truncate">{name}</h3>
              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
                {status}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                {party}
              </span>
              
              {isUserCandidate && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  You
                </span>
              )}
            </div>

            {/* Vote Count (if available) */}
            {voteCount !== undefined && (
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{voteCount} votes</span>
              </div>
            )}
          </div>
        </div>

        {/* Manifesto */}
        <div className="mb-4">
          <p className="text-gray-700 text-sm leading-relaxed">
            {isExpanded ? manifesto : truncateManifesto(manifesto)}
          </p>
          
          {manifesto && manifesto.length > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            {/* Vote Button */}
            {showVoteButton && status === 'Approved' && (
              <button
                onClick={handleVote}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Vote</span>
              </button>
            )}

            {/* Validation Buttons (for admins) */}
            {showValidateButton && status === 'Pending' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleValidate(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors duration-200 text-sm flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleValidate(false)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors duration-200 text-sm flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>

          {/* Candidate Address */}
          <div className="text-xs text-gray-500">
            {candidateAddress?.substring(0, 8)}...{candidateAddress?.substring(candidateAddress.length - 6)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;