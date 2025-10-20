import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWallet, useElection, useCandidates, useUI, useContract } from '../hooks';
import { MainLayout } from '../components/layout';
import { StatusBadge } from '../components';

const VotingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, isConnected, isCorrectNetwork } = useWallet();
  const { 
    currentElection, 
    loadElectionDetail, 
    voteStatus, 
    checkVoteStatus, 
    castVote,
    canVote
  } = useElection();
  const { candidates, loadCandidates } = useCandidates();
  const { showSuccess, showError, showConfirmationModal, showTransactionModal } = useUI();
  const { write: writeContract, loading: contractLoading } = useContract('election', currentElection?.contractAddress);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [voteVerification, setVoteVerification] = useState(null);

  // Load election and candidate data
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        navigate('/elections');
        return;
      }

      try {
        setLoading(true);
        await loadElectionDetail(id);
        
        if (currentElection?.electionId) {
          await loadCandidates(currentElection.electionId);
          
          // Check if user has already voted
          if (currentElection.contractAddress) {
            await checkVoteStatus(currentElection.contractAddress);
          }
        }
      } catch (error) {
        console.error('Error loading voting data:', error);
        showError('Failed to load election', 'Please try again later');
        navigate('/elections');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, loadElectionDetail, loadCandidates, checkVoteStatus, navigate, showError]);

  // Verify voting eligibility
  useEffect(() => {
    const verifyEligibility = async () => {
      if (!isConnected || !isCorrectNetwork || !currentElection) return;

      setVerifying(true);
      
      // Check if election is in voting phase
      if (currentElection.status !== 'Voting') {
        showError('Voting Not Active', 'Voting is not currently active for this election');
        navigate(`/election/${id}`);
        return;
      }

      // Check if user has already voted
      if (voteStatus) {
        showError('Already Voted', 'You have already cast your vote in this election');
        navigate(`/election/${id}`);
        return;
      }

      setVerifying(false);
    };

    verifyEligibility();
  }, [isConnected, isCorrectNetwork, currentElection, voteStatus, id, navigate, showError]);

  // Handle vote submission
  const handleVote = async () => {
    if (!selectedCandidate) {
      showError('No Candidate Selected', 'Please select a candidate to vote for');
      return;
    }

    if (!isConnected || !isCorrectNetwork) {
      showError('Wallet Required', 'Please connect your wallet to vote');
      return;
    }

    if (!currentElection?.contractAddress) {
      showError('Election Error', 'Cannot vote in this election');
      return;
    }

    const candidate = candidates.find(c => c.candidateId === selectedCandidate);
    if (!candidate) {
      showError('Invalid Candidate', 'Please select a valid candidate');
      return;
    }

    showConfirmationModal({
      title: 'Confirm Your Vote',
      message: (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 mb-2">
            You are about to vote for:
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="text-xl font-bold text-blue-900">{candidate.name}</div>
            <div className="text-blue-700">{candidate.party}</div>
          </div>
          <div className="text-sm text-gray-600 mb-4">
            This action is <span className="font-semibold text-red-600">irreversible</span> and will be permanently recorded on the blockchain.
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>Warning:</strong> You cannot change your vote after submission.
          </div>
        </div>
      ),
      confirmText: 'Yes, Cast My Vote',
      cancelText: 'Cancel',
      confirmButtonStyle: 'bg-green-600 hover:bg-green-700',
      onConfirm: async () => {
        await submitVote(selectedCandidate);
      }
    });
  };

  // Submit vote to blockchain
  const submitVote = async (candidateId) => {
    try {
      setVoting(true);
      
      showTransactionModal({
        status: 'pending',
        message: 'Processing your vote...',
        description: 'Please wait while we process your vote on the blockchain.'
      });

      // Cast vote on blockchain
      const result = await castVote(candidateId, currentElection.contractAddress);
      
      showTransactionModal({
        status: 'success',
        message: 'Vote Cast Successfully!',
        description: 'Your vote has been recorded on the blockchain.',
        hash: result.transactionHash
      });

      showSuccess('Vote Recorded', 'Your vote has been successfully cast and recorded on the blockchain');

      // Verify the vote was recorded
      setTimeout(async () => {
        await verifyVote();
      }, 2000);

    } catch (error) {
      console.error('Error casting vote:', error);
      
      showTransactionModal({
        status: 'error',
        message: 'Voting Failed',
        description: error.message || 'There was an error processing your vote.'
      });

      showError('Voting Failed', error.message);
    } finally {
      setVoting(false);
    }
  };

  // Verify vote was recorded
  const verifyVote = async () => {
    try {
      setVerifying(true);
      await checkVoteStatus(currentElection.contractAddress);
      
      if (voteStatus) {
        setVoteVerification({
          success: true,
          message: 'Your vote has been successfully verified on the blockchain.'
        });
      } else {
        setVoteVerification({
          success: false,
          message: 'Unable to verify your vote. Please check the transaction receipt.'
        });
      }
    } catch (error) {
      console.error('Error verifying vote:', error);
      setVoteVerification({
        success: false,
        message: 'Verification failed. Please check the transaction receipt.'
      });
    } finally {
      setVerifying(false);
    }
  };

  // Render connection and eligibility checks
  const renderEligibilityCheck = () => {
    if (!isConnected) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-semibold text-yellow-800">Wallet Not Connected</h3>
          </div>
          <p className="text-yellow-700 mb-4">
            Please connect your wallet to participate in voting.
          </p>
        </div>
      );
    }

    if (!isCorrectNetwork) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800">Wrong Network</h3>
          </div>
          <p className="text-red-700 mb-4">
            Please switch to Sepolia Testnet to participate in voting.
          </p>
        </div>
      );
    }

    if (currentElection?.status !== 'Voting') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-blue-800">Voting Not Active</h3>
          </div>
          <p className="text-blue-700 mb-4">
            Voting is not currently active for this election.
          </p>
          <Link
            to={`/election/${id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            View Election Details
          </Link>
        </div>
      );
    }

    if (voteStatus) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-green-800">Already Voted</h3>
          </div>
          <p className="text-green-700 mb-4">
            You have already cast your vote in this election.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/election/${id}`}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              View Results
            </Link>
            <Link
              to="/elections"
              className="border border-green-600 text-green-600 hover:bg-green-50 px-6 py-3 rounded-lg font-medium"
            >
              Browse Other Elections
            </Link>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render candidate selection
  const renderCandidateSelection = () => {
    const approvedCandidates = candidates.filter(c => c.status === 'Approved');

    if (approvedCandidates.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Candidates Available</h3>
          <p className="text-gray-500 mb-6">
            There are no approved candidates for this election yet.
          </p>
          <Link
            to={`/election/${id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Back to Election
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Select Your Candidate ({approvedCandidates.length} available)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {approvedCandidates.map(candidate => (
            <div
              key={candidate.candidateId || candidate._id}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                selectedCandidate === candidate.candidateId
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => setSelectedCandidate(candidate.candidateId)}
            >
              <div className="flex items-start space-x-4">
                {/* Selection Indicator */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedCandidate === candidate.candidateId
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedCandidate === candidate.candidateId && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Candidate Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{candidate.name}</h4>
                    {selectedCandidate === candidate.candidateId && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {candidate.party}
                    </span>
                    {candidate.voteCount !== undefined && (
                      <span className="text-sm text-gray-500">
                        {candidate.voteCount} votes
                      </span>
                    )}
                  </div>

                  {/* Manifesto Preview */}
                  {candidate.manifesto && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                        {candidate.manifesto}
                      </p>
                      {candidate.manifesto.length > 150 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // You could implement a modal to show full manifesto
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
                        >
                          Read more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render voting instructions
  const renderVotingInstructions = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">Voting Instructions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-700 font-bold text-xs">1</span>
          </div>
          <div>
            <strong>Select a candidate</strong> by clicking on their card
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-700 font-bold text-xs">2</span>
          </div>
          <div>
            <strong>Review your selection</strong> before confirming
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-700 font-bold text-xs">3</span>
          </div>
          <div>
            <strong>Confirm your vote</strong> - this action is irreversible
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-700 font-bold text-xs">4</span>
          </div>
          <div>
            <strong>Wait for confirmation</strong> on the blockchain
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-yellow-100 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="text-sm text-yellow-800">
            <strong>Important:</strong> Once submitted, your vote cannot be changed or withdrawn. 
            All votes are permanently recorded on the blockchain for transparency.
          </div>
        </div>
      </div>
    </div>
  );

  // Render vote confirmation section
  const renderVoteConfirmation = () => {
    if (!selectedCandidate) return null;

    const candidate = candidates.find(c => c.candidateId === selectedCandidate);
    if (!candidate) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 sticky bottom-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 mb-4 lg:mb-0">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Ready to Vote</h4>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 border border-green-200 rounded-lg px-3 py-2">
                <div className="font-semibold text-green-900">{candidate.name}</div>
                <div className="text-sm text-green-700">{candidate.party}</div>
              </div>
              <div className="text-sm text-gray-600">
                Your selection is ready for confirmation
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Change Selection
            </button>
            <button
              onClick={handleVote}
              disabled={voting || contractLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              {voting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Vote...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Confirm & Vote</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <MainLayout showSidebar={false}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="h-48 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Check if user is eligible to vote
  const isEligible = isConnected && isCorrectNetwork && currentElection?.status === 'Voting' && !voteStatus;

  return (
    <MainLayout showSidebar={false}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to={`/election/${id}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Election Details
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Cast Your Vote</h1>
          {currentElection && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="text-left">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{currentElection.name}</h2>
                  <p className="text-gray-600 mb-4 lg:mb-0">{currentElection.description}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <StatusBadge status={currentElection.status} size="lg" />
                  <div className="text-sm text-gray-500">
                    {currentElection.totalCandidates || 0} candidates
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Eligibility Check */}
        {!isEligible && renderEligibilityCheck()}

        {/* Voting Interface */}
        {isEligible && (
          <>
            {renderVotingInstructions()}
            {renderCandidateSelection()}
            {renderVoteConfirmation()}
          </>
        )}

        {/* Vote Verification Result */}
        {voteVerification && (
          <div className={`mt-6 rounded-xl p-6 ${
            voteVerification.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-3">
              {voteVerification.success ? (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              <div>
                <h4 className={`font-semibold ${
                  voteVerification.success ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {voteVerification.success ? 'Vote Verified' : 'Verification Notice'}
                </h4>
                <p className={`mt-1 ${
                  voteVerification.success ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {voteVerification.message}
                </p>
              </div>
            </div>
            
            {voteVerification.success && (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link
                  to={`/election/${id}`}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium text-center"
                >
                  View Election Results
                </Link>
                <Link
                  to="/elections"
                  className="border border-green-600 text-green-600 hover:bg-green-50 px-6 py-3 rounded-lg font-medium text-center"
                >
                  Browse Other Elections
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default VotingPage;