import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet, useUI, useElection } from '../hooks';
import { MainLayout } from '../components/layout';
import { ElectionCard, StatusBadge } from '../components';

const Dashboard = () => {
    const { account, isConnected, isCorrectNetwork, connectionStatus } = useWallet();
    const {
        elections = [],
        loadElections,
        currentElection,
        loadElectionDetail,
        voteStatus,
        checkVoteStatus
    } = useElection();
    const { showError, showSuccess } = useUI();

    const [activeTab, setActiveTab] = useState('active');
    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState({
        totalVotes: 0,
        electionsParticipated: 0,
        electionsCreated: 0,
        activeElections: 0
    });

    // Filter elections based on active tab
    const filteredElections = elections.filter(election => {
        const now = new Date();
        const startTime = new Date(election.startTime);
        const endTime = new Date(election.endTime);

        switch (activeTab) {
            case 'active':
                return now >= startTime && now <= endTime && election.status === 'Voting';
            case 'upcoming':
                return now < startTime && election.status === 'Registration';
            case 'ended':
                return now > endTime || election.status === 'Ended' || election.status === 'ResultDeclared';
            case 'my-elections':
                return election.creatorAddress?.toLowerCase() === account?.toLowerCase();
            default:
                return true;
        }
    });

    // Load elections and user data
    useEffect(() => {
        const loadDashboardData = async () => {
            if (!isConnected || !isCorrectNetwork) return;

            try {
                setLoading(true);
                await loadElections();

                // Calculate user statistics
                const userVotes = elections.filter(e =>
                    e.creatorAddress?.toLowerCase() === account?.toLowerCase()
                ).length;

                const participatedElections = elections.filter(e => {
                    // This would be replaced with actual vote data from your backend
                    return e.status === 'Ended' || e.status === 'ResultDeclared';
                }).length;

                const activeElectionsCount = elections.filter(e => {
                    const now = new Date();
                    const startTime = new Date(e.startTime);
                    const endTime = new Date(e.endTime);
                    return now >= startTime && now <= endTime && e.status === 'Voting';
                }).length;

                setUserStats({
                    totalVotes: participatedElections,
                    electionsParticipated: participatedElections,
                    electionsCreated: userVotes,
                    activeElections: activeElectionsCount
                });

            } catch (error) {
                console.error('Error loading dashboard data:', error);
                showError('Failed to load dashboard', 'Please try refreshing the page');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [isConnected, isCorrectNetwork, account, loadElections, showError]);

    // Handle election selection
    const handleViewElectionDetails = async (election) => {
        try {
            await loadElectionDetail(election._id || election.electionId);
            // Check if user has voted in this election
            if (election.contractAddress) {
                await checkVoteStatus(election.contractAddress);
            }
        } catch (error) {
            console.error('Error loading election details:', error);
            showError('Failed to load election details', error.message);
        }
    };

    // Render connection status message
    const renderConnectionStatus = () => {
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
                        Connect your wallet to view your dashboard and participate in elections.
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
                        Please switch to Sepolia Testnet to access the dashboard features.
                    </p>
                </div>
            );
        }

        return null;
    };

    // Render user stats cards
    const renderUserStats = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{userStats.totalVotes}</p>
                        <p className="text-sm text-gray-600">Total Votes Cast</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{userStats.electionsParticipated}</p>
                        <p className="text-sm text-gray-600">Elections Participated</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{userStats.electionsCreated}</p>
                        <p className="text-sm text-gray-600">Elections Created</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{userStats.activeElections}</p>
                        <p className="text-sm text-gray-600">Active Elections</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render user info card
    const renderUserInfo = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Welcome Back!</h2>
                        <p className="text-gray-600">
                            Connected as: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                {account?.substring(0, 8)}...{account?.substring(account.length - 6)}
                            </span>
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                            <StatusBadge status={connectionStatus === 'connected' ? 'VOTER' : 'DISCONNECTED'} size="sm" />
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">Sepolia Testnet</span>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <Link
                        to="/admin/create-election"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Create Election</span>
                    </Link>

                    <Link
                        to="/elections"
                        className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span>Browse All</span>
                    </Link>
                </div>
            </div>
        </div>
    );

    // Render tab navigation
    const renderTabNavigation = () => (
        <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {[
                    { id: 'active', name: 'Active Elections', count: filteredElections.length },
                    {
                        id: 'upcoming', name: 'Upcoming', count: elections.filter(e => {
                            const now = new Date();
                            return now < new Date(e.startTime) && e.status === 'Registration';
                        }).length
                    },
                    {
                        id: 'ended', name: 'Ended', count: elections.filter(e => {
                            const now = new Date();
                            return now > new Date(e.endTime) || e.status === 'Ended' || e.status === 'ResultDeclared';
                        }).length
                    },
                    {
                        id: 'my-elections', name: 'My Elections', count: elections.filter(e =>
                            e.creatorAddress?.toLowerCase() === account?.toLowerCase()
                        ).length
                    },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <span>{tab.name}</span>
                        {tab.count > 0 && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activeTab === tab.id
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
    );

    // Render elections grid
    const renderElectionsGrid = () => {
        if (loading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            );
        }

        if (filteredElections.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No elections found</h3>
                    <p className="text-gray-500 mb-6">
                        {activeTab === 'active' && 'There are no active elections at the moment.'}
                        {activeTab === 'upcoming' && 'No upcoming elections scheduled.'}
                        {activeTab === 'ended' && 'No completed elections yet.'}
                        {activeTab === 'my-elections' && "You haven't created any elections yet."}
                    </p>
                    {activeTab === 'my-elections' && (
                        <Link
                            to="/admin/create-election"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 inline-flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Create Your First Election</span>
                        </Link>
                    )}
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredElections.map((election) => (
                    <ElectionCard
                        key={election._id || election.electionId}
                        election={election}
                        onViewDetails={handleViewElectionDetails}
                        showActions={activeTab === 'my-elections'}
                    />
                ))}
            </div>
        );
    };

    // Quick actions section
    const renderQuickActions = () => (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                    to="/admin/create-election"
                    className="bg-white hover:bg-blue-50 border border-blue-200 rounded-lg p-4 transition-colors duration-200 group"
                >
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Create Election</p>
                            <p className="text-sm text-gray-600">Start a new vote</p>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/elections"
                    className="bg-white hover:bg-green-50 border border-green-200 rounded-lg p-4 transition-colors duration-200 group"
                >
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Vote Now</p>
                            <p className="text-sm text-gray-600">Active elections</p>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/admin"
                    className="bg-white hover:bg-purple-50 border border-purple-200 rounded-lg p-4 transition-colors duration-200 group"
                >
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Admin Panel</p>
                            <p className="text-sm text-gray-600">Manage elections</p>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/my-votes"
                    className="bg-white hover:bg-orange-50 border border-orange-200 rounded-lg p-4 transition-colors duration-200 group"
                >
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">My Votes</p>
                            <p className="text-sm text-gray-600">Voting history</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );

    return (
        <MainLayout showSidebar={false}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-2">
                        Manage your elections, track your votes, and participate in community decisions
                    </p>
                </div>

                {/* Connection Status */}
                {renderConnectionStatus()}

                {/* Only show dashboard content if properly connected */}
                {isConnected && isCorrectNetwork && (
                    <>
                        {/* User Info */}
                        {renderUserInfo()}

                        {/* Quick Actions */}
                        {renderQuickActions()}

                        {/* User Stats */}
                        {renderUserStats()}

                        {/* Tab Navigation */}
                        {renderTabNavigation()}

                        {/* Elections Grid */}
                        {renderElectionsGrid()}
                    </>
                )}
            </div>
        </MainLayout>
    );
};

export default Dashboard;