import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet, useUI } from '../hooks';
import { MainLayout } from '../components/layout';
import { ElectionCard } from '../components';

const Home = () => {
    const { isConnected, connect, isCorrectNetwork } = useWallet();
    const { showError } = useUI();

    // Mock data for featured elections (you'll replace this with real data)
    const featuredElections = [
        {
            _id: '1',
            name: 'Community DAO Proposal Voting',
            description: 'Vote on important proposals for our community decentralized autonomous organization. Help shape the future of our ecosystem.',
            startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            status: 'Registration',
            totalVotes: 0,
            totalCandidates: 3,
            creatorAddress: '0x742e35c2e3f7d6c5b7d2c8b1c6d5e4f3a2b1c0d9',
            isActive: true
        },
        {
            _id: '2',
            name: 'Project Grant Allocation',
            description: 'Decide how to allocate community funds to promising projects. Review proposals and vote for the most impactful initiatives.',
            startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            status: 'Voting',
            totalVotes: 1247,
            totalCandidates: 8,
            creatorAddress: '0x842e35c2e3f7d6c5b7d2c8b1c6d5e4f3a2b1c0d9',
            isActive: true
        },
        {
            _id: '3',
            name: 'Platform Feature Priorities',
            description: 'Help us decide which features to build next. Your vote determines our development roadmap for the next quarter.',
            startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            status: 'Voting',
            totalVotes: 892,
            totalCandidates: 5,
            creatorAddress: '0x942e35c2e3f7d6c5b7d2c8b1c6d5e4f3a2b1c0d9',
            isActive: true
        }
    ];

    const features = [
        {
            icon: (
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            ),
            title: 'Secure & Immutable',
            description: 'Every vote is recorded on the blockchain, ensuring transparency and preventing tampering or fraud.'
        },
        {
            icon: (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            title: 'Instant Results',
            description: 'Real-time vote counting with immediate result availability once the election period ends.'
        },
        {
            icon: (
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            title: 'Community Driven',
            description: 'Empower your community with transparent voting processes that everyone can trust and verify.'
        }
    ];

    const steps = [
        {
            number: '1',
            title: 'Connect Your Wallet',
            description: 'Securely connect your Ethereum wallet using MetaMask or other Web3 providers.',
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            number: '2',
            title: 'Register or Vote',
            description: 'Register as a candidate during registration periods or cast your vote during voting periods.',
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            number: '3',
            title: 'Verify on Blockchain',
            description: 'Every transaction is recorded on the blockchain for complete transparency and auditability.',
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            )
        },
        {
            number: '4',
            title: 'See Real-time Results',
            description: 'Watch live results or view final outcomes with complete vote verification.',
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        }
    ];

    const handleGetStarted = async () => {
        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                showError('Connection Failed', 'Please install MetaMask to continue');
            }
        }
    };

    const handleViewElectionDetails = (election) => {
        // Navigate to election details page
        console.log('View election details:', election);
    };

    return (
        <MainLayout showSidebar={false}>
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-10"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                            Decentralized Voting
                            <span className="block text-blue-200">For Everyone</span>
                        </h1>
                        <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto leading-relaxed">
                            Transparent, secure, and immutable voting powered by blockchain technology.
                            Empower your community with trustless democratic processes.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            {!isConnected ? (
                                <button
                                    onClick={handleGetStarted}
                                    className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    Connect Wallet to Start
                                </button>
                            ) : !isCorrectNetwork ? (
                                <div className="text-center">
                                    <p className="text-yellow-200 mb-4">Please switch to Sepolia Testnet</p>
                                    <Link
                                        to="/dashboard"
                                        className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl inline-block"
                                    >
                                        Go to Dashboard
                                    </Link>
                                </div>
                            ) : (
                                <Link
                                    to="/dashboard"
                                    className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    Enter Dashboard
                                </Link>
                            )}
                            <Link
                                to="/elections"
                                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105"
                            >
                                Browse Elections
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
                            <div className="text-center">
                                <div className="text-3xl font-bold">50+</div>
                                <div className="text-blue-200">Elections</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold">10K+</div>
                                <div className="text-blue-200">Votes Cast</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold">99.9%</div>
                                <div className="text-blue-200">Uptime</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold">100%</div>
                                <div className="text-blue-200">Transparent</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wave Divider */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg className="w-full h-12 text-gray-50" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="currentColor"></path>
                        <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="currentColor"></path>
                        <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="currentColor"></path>
                    </svg>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Why Choose SecureVote?
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Built on blockchain technology to provide unparalleled security, transparency, and trust in every vote.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 border border-gray-100">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Simple, secure, and transparent voting in just four easy steps
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="relative text-center">
                                {/* Connecting Line */}
                                {index < steps.length - 1 && (
                                    <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-blue-200 -z-10"></div>
                                )}

                                <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                                    {step.icon}
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                                    <div className="text-2xl font-bold text-blue-600 mb-2">
                                        {step.number}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                                        {step.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Elections Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                Featured Elections
                            </h2>
                            <p className="text-xl text-gray-600">
                                Participate in ongoing community decisions
                            </p>
                        </div>
                        <Link
                            to="/elections"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 hidden sm:block"
                        >
                            View All Elections
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                        {featuredElections.map((election) => (
                            <ElectionCard
                                key={election._id}
                                election={election}
                                onViewDetails={handleViewElectionDetails}
                            />
                        ))}
                    </div>

                    <div className="text-center sm:hidden">
                        <Link
                            to="/elections"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 inline-block"
                        >
                            View All Elections
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
                <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Ready to Start Voting?
                    </h2>
                    <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
                        Join thousands of users who trust SecureVote for transparent and secure democratic processes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {!isConnected ? (
                            <button
                                onClick={handleGetStarted}
                                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105"
                            >
                                Connect Wallet & Start
                            </button>
                        ) : (
                            <Link
                                to="/dashboard"
                                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105"
                            >
                                Go to Dashboard
                            </Link>
                        )}
                        <Link
                            to="/admin/create-election"
                            className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105"
                        >
                            Create Election
                        </Link>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
};

export default Home;