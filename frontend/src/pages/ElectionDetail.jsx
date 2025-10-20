import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWallet, useElection, useCandidates, useUI, useContract } from '../hooks';
import { MainLayout } from '../components';
import { ElectionCard, CandidateCard, StatusBadge } from '../components';

const ElectionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { account, isConnected, isCorrectNetwork } = useWallet();
    const {
        currentElection,
        loadElectionDetail,
        voteStatus,
        checkVoteStatus,
        castVote,
        changeElectionStatus,
        canVote,
        canRegister,
        isElectionManager,
        isElectionActive
    } = useElection();
    const {
        candidates,
        loadCandidates,
        registerCandidate,
        validateCandidate,
        isUserCandidate
    } = useCandidates();
    const { showSuccess, showError, showConfirmationModal } = useUI();
    const { write: writeContract, loading: contractLoading } = useContract('election', currentElection?.contractAddress);

    const [activeTab, setActiveTab] = useState('candidates');
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [voting, setVoting] = useState(false);
    const [showRegistrationForm, setShowRegistrationForm] = useState(false);
    const [registrationForm, setRegistrationForm] = useState({
        name: '',
        party: '',
        manifesto: '',
        imageFile: null
    });

    // Load election data
    useEffect(() => {
        const loadData = async () => {
            if (!id) return;

            try {
                setLoading(true);
                await loadElectionDetail(id);

                if (currentElection?.electionId) {
                    await loadCandidates(currentElection.electionId);

                    // Check if user has voted in this election
                    if (currentElection.contractAddress) {
                        await checkVoteStatus(currentElection.contractAddress);
                    }
                }
            } catch (error) {
                console.error('Error loading election details:', error);
                showError('Failed to load election', 'Please try again later');
                navigate('/elections');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, loadElectionDetail, loadCandidates, checkVoteStatus, navigate, showError]);

    // Handle candidate registration
    const handleRegisterCandidate = async (e) => {
        e.preventDefault();

        if (!isConnected || !isCorrectNetwork) {
            showError('Wallet Required', 'Please connect your wallet to register as candidate');
            return;
        }

        if (!currentElection) {
            showError('Election Not Found', 'Cannot register for this election');
            return;
        }

        try {
            setRegistering(true);

            // For now, we'll use a placeholder image hash
            // In a real implementation, you'd upload the image to IPFS first
            const imageHash = 'QmPlaceholderImageHash123456789';

            await registerCandidate({
                electionAddress: currentElection.contractAddress,
                electionId: currentElection.electionId,
                name: registrationForm.name,
                party: registrationForm.party,
                manifesto: registrationForm.manifesto,
                imageHash: imageHash
            });

            showSuccess('Registration Submitted', 'Your candidate registration has been submitted for approval');
            setShowRegistrationForm(false);
            setRegistrationForm({
                name: '',
                party: '',
                manifesto: '',
                imageFile: null
            });

            // Reload candidates to show the new registration
            await loadCandidates(currentElection.electionId);

        } catch (error) {
            console.error('Error registering candidate:', error);
            showError('Registration Failed', error.message);
        } finally {
            setRegistering(false);
        }
    };

    // Handle voting
    const handleVote = async (candidateId) => {
        if (!isConnected || !isCorrectNetwork) {
            showError('Wallet Required', 'Please connect your wallet to vote');
            return;
        }

        if (!currentElection?.contractAddress) {
            showError('Election Error', 'Cannot vote in this election');
            return;
        }

        showConfirmationModal({
            title: 'Confirm Your Vote',
            message: `Are you sure you want to vote for this candidate? This action is irreversible and will be recorded on the blockchain.`,
            confirmText: 'Yes, Cast My Vote',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    setVoting(true);
                    await castVote(candidateId, currentElection.contractAddress);
                    showSuccess('Vote Cast Successfully', 'Your vote has been recorded on the blockchain');
                    // Refresh vote status
                    await checkVoteStatus(currentElection.contractAddress);
                } catch (error) {
                    console.error('Error casting vote:', error);
                    showError('Voting Failed', error.message);
                } finally {
                    setVoting(false);
                }
            }
        });
    };

    // Handle election status change
    const handleStatusChange = async (newStatus) => {
        if (!isElectionManager) {
            showError('Permission Denied', 'Only the election manager can change status');
            return;
        }

        const statusMessages = {
            'Registration': 'Start candidate registration phase?',
            'Voting': 'Start voting phase?',
            'Ended': 'End this election?',
            'ResultDeclared': 'Declare final results?'
        };

        showConfirmationModal({
            title: `Change Election Status to ${newStatus}`,
            message: `Are you sure you want to ${statusMessages[newStatus]}`,
            confirmText: `Yes, ${newStatus}`,
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await changeElectionStatus(newStatus, currentElection.contractAddress);
                    showSuccess('Status Updated', `Election status changed to ${newStatus}`);
                    // Reload election data
                    await loadElectionDetail(id);
                } catch (error) {
                    console.error('Error changing election status:', error);
                    showError('Status Change Failed', error.message);
                }
            }
        });
    };

    // Handle image upload (placeholder - you'll implement IPFS upload)
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type and size
            if (!file.type.startsWith('image/')) {
                showError('Invalid File', 'Please select an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showError('File Too Large', 'Please select an image smaller than 5MB');
                return;
            }
            setRegistrationForm(prev => ({ ...prev, imageFile: file }));
        }
    };

    // Render election header
    const renderElectionHeader = () => {
        if (loading) {
            return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            );
        }

        if (!currentElection) {
            return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Election Not Found</h2>
                    <p className="text-gray-600 mb-6">The requested election could not be found.</p>
                    <Link
                        to="/elections"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                    >
                        Browse Elections
                    </Link>
                </div>
            );
        }

        const now = new Date();
        const startTime = new Date(currentElection.startTime);
        const endTime = new Date(currentElection.endTime);
        const registrationDeadline = new Date(currentElection.registrationDeadline);

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-6 text-white">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                                <h1 className="text-2xl lg:text-3xl font-bold">{currentElection.name}</h1>
                                <StatusBadge status={currentElection.status} size="lg" />
                            </div>
                            <p className="text-blue-100 text-lg leading-relaxed max-w-4xl">
                                {currentElection.description}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0 lg:ml-6">
                            {isElectionManager && (
                                <button
                                    onClick={() => handleStatusChange(getNextStatus())}
                                    className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                >
                                    {getNextStatusAction()}
                                </button>
                            )}

                            {canRegister && !isUserCandidate(candidates) && (
                                <button
                                    onClick={() => setShowRegistrationForm(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                >
                                    Register as Candidate
                                </button>
                            )}

                            {canVote && (
                                <Link
                                    to={`/election/${id}/vote`}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                >
                                    Cast Your Vote
                                </Link>
                            )}

                            {(currentElection.status === 'Ended' || currentElection.status === 'ResultDeclared') && (
                                <Link
                                    to={`/election/${id}/results`}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                >
                                    View Results
                                </Link>
                            )}

                            {voteStatus && (
                                <span className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium">
                                    Already Voted
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Election Stats */}
                <div className="p-6 border-b border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{currentElection.totalCandidates || 0}</div>
                            <div className="text-sm text-gray-600">Candidates</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{currentElection.totalVotes || 0}</div>
                            <div className="text-sm text-gray-600">Total Votes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {Math.round((currentElection.totalVotes || 0) / Math.max((currentElection.totalCandidates || 1), 1))}
                            </div>
                            <div className="text-sm text-gray-600">Avg. Votes/Candidate</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {currentElection.status === 'Ended' ? 'Completed' : 'Active'}
                            </div>
                            <div className="text-sm text-gray-600">Status</div>
                        </div>
                    </div>
                </div>

                {/* Election Timeline */}
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Election Timeline</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-lg border-2 ${now >= registrationDeadline
                                ? 'border-green-200 bg-green-50'
                                : 'border-blue-200 bg-blue-50'
                            }`}>
                            <div className="text-sm font-medium text-gray-600">Registration</div>
                            <div className="text-lg font-semibold text-gray-900">
                                Until {registrationDeadline.toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                                {now >= registrationDeadline ? 'Closed' : 'Open'}
                            </div>
                        </div>

                        <div className={`p-4 rounded-lg border-2 ${now >= startTime && now <= endTime
                                ? 'border-green-200 bg-green-50'
                                : now > endTime
                                    ? 'border-gray-200 bg-gray-50'
                                    : 'border-blue-200 bg-blue-50'
                            }`}>
                            <div className="text-sm font-medium text-gray-600">Voting Period</div>
                            <div className="text-lg font-semibold text-gray-900">
                                {startTime.toLocaleDateString()} - {endTime.toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                                {now < startTime ? 'Starts Soon' : now > endTime ? 'Ended' : 'Active Now'}
                            </div>
                        </div>

                        <div className={`p-4 rounded-lg border-2 ${now > endTime
                                ? 'border-green-200 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}>
                            <div className="text-sm font-medium text-gray-600">Results</div>
                            <div className="text-lg font-semibold text-gray-900">
                                {now > endTime ? 'Available' : 'After Voting'}
                            </div>
                            <div className="text-sm text-gray-500">
                                {now > endTime ? 'View Results' : 'Not Available'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Get next status for manager actions
    const getNextStatus = () => {
        const statusFlow = {
            'Created': 'Registration',
            'Registration': 'Voting',
            'Voting': 'Ended',
            'Ended': 'ResultDeclared'
        };
        return statusFlow[currentElection?.status] || 'Registration';
    };

    const getNextStatusAction = () => {
        const actions = {
            'Created': 'Start Registration',
            'Registration': 'Start Voting',
            'Voting': 'End Election',
            'Ended': 'Declare Results'
        };
        return actions[currentElection?.status] || 'Manage';
    };

    // Render candidate registration form
    const renderRegistrationForm = () => {
        if (!showRegistrationForm) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Register as Candidate</h3>
                        <button
                            onClick={() => setShowRegistrationForm(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleRegisterCandidate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={registrationForm.name}
                                onChange={(e) => setRegistrationForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Party/Affiliation *
                            </label>
                            <input
                                type="text"
                                required
                                value={registrationForm.party}
                                onChange={(e) => setRegistrationForm(prev => ({ ...prev, party: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your party or affiliation"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Profile Image
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Optional. Max 5MB. JPG, PNG, or GIF.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Manifesto *
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={registrationForm.manifesto}
                                onChange={(e) => setRegistrationForm(prev => ({ ...prev, manifesto: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Describe your platform and goals..."
                            />
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowRegistrationForm(false)}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={registering}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                            >
                                {registering ? 'Registering...' : 'Register'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // Render candidates tab
    const renderCandidatesTab = () => {
        const approvedCandidates = candidates.filter(c => c.status === 'Approved');
        const pendingCandidates = candidates.filter(c => c.status === 'Pending');

        return (
            <div className="space-y-6">
                {/* Approved Candidates */}
                {approvedCandidates.length > 0 && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                            Approved Candidates ({approvedCandidates.length})
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {approvedCandidates.map(candidate => (
                                <CandidateCard
                                    key={candidate.candidateId || candidate._id}
                                    candidate={candidate}
                                    election={currentElection}
                                    showVoteButton={canVote && !voteStatus}
                                    onVote={handleVote}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Pending Candidates (only show to managers or the candidates themselves) */}
                {pendingCandidates.length > 0 && (isElectionManager || isUserCandidate(pendingCandidates)) && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                            Pending Approval ({pendingCandidates.length})
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {pendingCandidates.map(candidate => (
                                <CandidateCard
                                    key={candidate.candidateId || candidate._id}
                                    candidate={candidate}
                                    election={currentElection}
                                    showValidateButton={isElectionManager}
                                    onValidate={(candidateId, approved) =>
                                        validateCandidate(candidateId, approved, currentElection.contractAddress)
                                    }
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* No Candidates Message */}
                {candidates.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Candidates Yet</h3>
                        <p className="text-gray-500 mb-6">
                            {currentElection.status === 'Registration'
                                ? 'Be the first to register as a candidate!'
                                : 'Candidate registration has not started yet.'
                            }
                        </p>
                        {canRegister && !isUserCandidate(candidates) && (
                            <button
                                onClick={() => setShowRegistrationForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                            >
                                Register as Candidate
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render results tab
    const renderResultsTab = () => {
        const approvedCandidates = candidates.filter(c => c.status === 'Approved')
            .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

        const totalVotes = approvedCandidates.reduce((sum, candidate) => sum + (candidate.voteCount || 0), 0);
        const winner = approvedCandidates[0];

        return (
            <div className="space-y-6">
                {currentElection.status === 'Ended' || currentElection.status === 'ResultDeclared' ? (
                    <>
                        {/* Winner Announcement */}
                        {winner && winner.voteCount > 0 && (
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">Election Winner</h3>
                                    <p className="text-xl font-semibold mb-1">{winner.name}</p>
                                    <p className="text-green-100">{winner.party}</p>
                                    <p className="text-green-100 mt-2">
                                        {winner.voteCount} votes ({totalVotes > 0 ? Math.round((winner.voteCount / totalVotes) * 100) : 0}%)
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Results Summary */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Results Summary</h3>
                            <div className="space-y-4">
                                {approvedCandidates.map((candidate, index) => {
                                    const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0;

                                    return (
                                        <div key={candidate.candidateId || candidate._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-4 flex-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' :
                                                        index === 1 ? 'bg-gray-400' :
                                                            index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-semibold text-gray-900">{candidate.name}</span>
                                                        <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                                            {candidate.party}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-gray-900">{candidate.voteCount || 0}</div>
                                                <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Results Not Available</h3>
                        <p className="text-gray-500">
                            Election results will be available after the voting period ends.
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // Render loading state
    if (loading) {
        return (
            <MainLayout showSidebar={false}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="h-64 bg-gray-200 rounded"></div>
                                <div className="h-32 bg-gray-200 rounded"></div>
                            </div>
                            <div className="space-y-4">
                                <div className="h-32 bg-gray-200 rounded"></div>
                                <div className="h-32 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!currentElection) {
        return (
            <MainLayout showSidebar={false}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center py-12">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Election Not Found</h1>
                        <p className="text-gray-600 mb-8">The election you're looking for doesn't exist.</p>
                        <Link
                            to="/elections"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                        >
                            Browse Elections
                        </Link>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout showSidebar={false}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <div className="mb-6">
                    <Link
                        to="/elections"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Elections
                    </Link>
                </div>

                {/* Election Header */}
                {renderElectionHeader()}

                {/* Tab Navigation */}
                <div className="mt-8 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'candidates', name: 'Candidates', count: candidates.length },
                            { id: 'results', name: 'Results', count: 0 },
                            { id: 'information', name: 'Information', count: 0 },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab.name}
                                {tab.count > 0 && (
                                    <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${activeTab === tab.id
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    {activeTab === 'candidates' && renderCandidatesTab()}
                    {activeTab === 'results' && renderResultsTab()}
                    {activeTab === 'information' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Election Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Election Details</h4>
                                    <dl className="space-y-2">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-600">Contract Address:</dt>
                                            <dd className="text-gray-900 font-mono text-sm">
                                                {currentElection.contractAddress?.substring(0, 8)}...
                                                {currentElection.contractAddress?.substring(currentElection.contractAddress.length - 6)}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-600">Election ID:</dt>
                                            <dd className="text-gray-900">{currentElection.electionId}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-600">Created by:</dt>
                                            <dd className="text-gray-900 font-mono text-sm">
                                                {currentElection.creatorAddress?.substring(0, 8)}...
                                                {currentElection.creatorAddress?.substring(currentElection.creatorAddress.length - 6)}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Voting Rules</h4>
                                    <ul className="space-y-2 text-gray-600">
                                        <li className="flex items-center">
                                            <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            One vote per wallet address
                                        </li>
                                        <li className="flex items-center">
                                            <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Votes are immutable and transparent
                                        </li>
                                        <li className="flex items-center">
                                            <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Real-time results on blockchain
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Registration Form Modal */}
                {renderRegistrationForm()}
            </div>
        </MainLayout>
    );
};

export default ElectionDetail;