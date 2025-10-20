import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWallet, useElection, useCandidates, useUI } from '../hooks';
import { MainLayout } from '../components/layout';
import { StatusBadge } from '../components';

const ResultsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, isConnected } = useWallet();
  const { 
    currentElection, 
    loadElectionDetail, 
    voteStatus 
  } = useElection();
  const { candidates, loadCandidates } = useCandidates();
  const { showError } = useUI();

  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [chartData, setChartData] = useState(null);
  const confettiRef = useRef(null);

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
        }
      } catch (error) {
        console.error('Error loading results data:', error);
        showError('Failed to load results', 'Please try again later');
        navigate('/elections');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, loadElectionDetail, loadCandidates, navigate, showError]);

  // Process results data for charts
  useEffect(() => {
    if (candidates.length > 0 && currentElection) {
      processChartData();
    }
  }, [candidates, currentElection]);

  // Trigger confetti when results are loaded and there's a winner
  useEffect(() => {
    if (chartData?.winner && currentElection?.status === 'ResultDeclared') {
      triggerConfetti();
    }
  }, [chartData, currentElection]);

  // Process data for charts and calculations
  const processChartData = () => {
    const approvedCandidates = candidates
      .filter(c => c.status === 'Approved')
      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

    const totalVotes = approvedCandidates.reduce((sum, candidate) => sum + (candidate.voteCount || 0), 0);
    const winner = approvedCandidates.length > 0 ? approvedCandidates[0] : null;

    // Calculate percentages and prepare chart data
    const chartData = {
      candidates: approvedCandidates.map(candidate => ({
        ...candidate,
        percentage: totalVotes > 0 ? ((candidate.voteCount || 0) / totalVotes) * 100 : 0,
        formattedPercentage: totalVotes > 0 ? ((candidate.voteCount || 0) / totalVotes * 100).toFixed(1) : '0.0'
      })),
      totalVotes,
      winner,
      participationRate: calculateParticipationRate(),
      voteDistribution: calculateVoteDistribution(approvedCandidates)
    };

    setChartData(chartData);
  };

  // Calculate participation rate (mock data - you'd replace with real data)
  const calculateParticipationRate = () => {
    // This would normally come from your backend/blockchain
    const totalEligibleVoters = 1000; // Mock data
    const participationRate = currentElection?.totalVotes ? 
      (currentElection.totalVotes / totalEligibleVoters) * 100 : 0;
    
    return Math.min(participationRate, 100); // Cap at 100%
  };

  // Calculate vote distribution for pie chart
  const calculateVoteDistribution = (candidates) => {
    return candidates.map((candidate, index) => ({
      name: candidate.name,
      votes: candidate.voteCount || 0,
      color: getCandidateColor(index),
      percentage: chartData?.candidates?.[index]?.formattedPercentage || '0.0'
    }));
  };

  // Get color for candidate based on position
  const getCandidateColor = (index) => {
    const colors = [
      '#3B82F6', // Blue - 1st
      '#10B981', // Green - 2nd
      '#F59E0B', // Yellow - 3rd
      '#EF4444', // Red - 4th
      '#8B5CF6', // Purple - 5th
      '#06B6D4', // Cyan - 6th
      '#84CC16', // Lime - 7th
      '#F97316', // Orange - 8th
      '#EC4899', // Pink - 9th
      '#6B7280', // Gray - 10th+
    ];
    return colors[index] || colors[colors.length - 1];
  };

  // Trigger confetti animation
  const triggerConfetti = () => {
    if (confettiRef.current) {
      // Simple confetti effect using CSS
      const confetti = confettiRef.current;
      confetti.innerHTML = '';
      
      for (let i = 0; i < 150; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.cssText = `
          position: fixed;
          width: 10px;
          height: 10px;
          background: ${getRandomColor()};
          top: -10px;
          left: ${Math.random() * 100}vw;
          opacity: ${Math.random() * 0.5 + 0.5};
          animation: confetti-fall ${Math.random() * 3 + 2}s linear forwards;
          z-index: 1000;
          border-radius: 2px;
        `;
        confetti.appendChild(particle);
      }

      // Remove confetti after animation
      setTimeout(() => {
        confetti.innerHTML = '';
      }, 5000);
    }
  };

  const getRandomColor = () => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Render winner announcement
  const renderWinnerAnnouncement = () => {
    if (!chartData?.winner || chartData.winner.voteCount === 0) {
      return null;
    }

    return (
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-8 text-white text-center mb-8 relative overflow-hidden">
        {/* Confetti Container */}
        <div ref={confettiRef} className="confetti-container"></div>
        
        {/* Winner Badge */}
        <div className="absolute top-4 right-4 bg-white text-orange-600 px-3 py-1 rounded-full text-sm font-bold">
          🏆 Winner
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
            </svg>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Election Results Declared!</h2>
          
          <div className="bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-2xl md:text-3xl font-bold mb-2">{chartData.winner.name}</h3>
            <p className="text-xl opacity-90 mb-4">{chartData.winner.party}</p>
            
            <div className="flex justify-center items-center space-x-6 text-lg">
              <div className="bg-white bg-opacity-30 rounded-lg px-4 py-2">
                <div className="font-bold">{chartData.winner.voteCount}</div>
                <div className="text-sm opacity-90">Total Votes</div>
              </div>
              <div className="bg-white bg-opacity-30 rounded-lg px-4 py-2">
                <div className="font-bold">{chartData.winner.formattedPercentage}%</div>
                <div className="text-sm opacity-90">Vote Share</div>
              </div>
            </div>
          </div>

          {chartData.winner.manifesto && (
            <div className="mt-6 bg-white bg-opacity-10 rounded-lg p-4 text-left">
              <h4 className="font-semibold mb-2">Winner's Platform:</h4>
              <p className="text-sm opacity-90 leading-relaxed">
                {chartData.winner.manifesto}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render results overview
  const renderResultsOverview = () => {
    if (!chartData) return null;

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{chartData.candidates.length}</div>
            <div className="text-sm text-gray-600 mt-1">Candidates</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{chartData.totalVotes}</div>
            <div className="text-sm text-gray-600 mt-1">Total Votes</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">{chartData.participationRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600 mt-1">Participation</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {chartData.winner ? chartData.winner.formattedPercentage : '0'}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Winner's Share</div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Votes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chartData.candidates.map((candidate, index) => (
                  <tr 
                    key={candidate.candidateId || candidate._id}
                    className={index === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        {index === 0 && (
                          <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            Winner
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block">
                        {candidate.party}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {candidate.voteCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span className={`${
                        index === 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {candidate.formattedPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vote Progress Bars */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vote Distribution</h3>
          <div className="space-y-4">
            {chartData.candidates.map((candidate, index) => (
              <div key={candidate.candidateId || candidate._id} className="flex items-center space-x-4">
                <div className="w-20 text-sm font-medium text-gray-900 truncate">
                  {candidate.name}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{candidate.party}</span>
                    <span>{candidate.voteCount || 0} votes ({candidate.formattedPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${candidate.percentage}%`,
                        backgroundColor: getCandidateColor(index)
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render visual charts view
  const renderChartsView = () => {
    if (!chartData) return null;

    return (
      <div className="space-y-6">
        {/* Pie Chart Visualization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Vote Distribution Chart</h3>
          <div className="flex flex-col lg:flex-row items-center justify-between">
            {/* Pie Chart */}
            <div className="w-64 h-64 relative mb-6 lg:mb-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {chartData.voteDistribution.reduce((acc, candidate, index) => {
                  const previousPercent = acc.reduce((sum, c) => sum + (c.percentage || 0), 0);
                  const percent = parseFloat(candidate.percentage);
                  
                  if (percent > 0) {
                    const largeArc = percent > 50 ? 1 : 0;
                    const startAngle = previousPercent * 3.6;
                    const endAngle = (previousPercent + percent) * 3.6;
                    
                    const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                    const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                    const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
                    const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
                    
                    acc.push(
                      <path
                        key={index}
                        d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`}
                        fill={candidate.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  }
                  return acc;
                }, [])}
                <circle cx="50" cy="50" r="15" fill="white" />
              </svg>
            </div>

            {/* Legend */}
            <div className="flex-1 max-w-md">
              <h4 className="font-semibold text-gray-900 mb-4">Candidates Legend</h4>
              <div className="space-y-3">
                {chartData.voteDistribution.map((candidate, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: candidate.color }}
                    ></div>
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-gray-900">{candidate.name}</span>
                      <span className="text-gray-500 ml-2">({candidate.party})</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {candidate.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Vote Comparison</h3>
          <div className="space-y-4">
            {chartData.candidates.map((candidate, index) => (
              <div key={candidate.candidateId || candidate._id} className="flex items-center space-x-4">
                <div className="w-32 text-sm font-medium text-gray-900 truncate">
                  {candidate.name}
                </div>
                <div className="flex-1">
                  <div 
                    className="h-8 rounded-lg transition-all duration-1000 ease-out flex items-center justify-end pr-3 text-white font-medium text-sm"
                    style={{ 
                      width: `${Math.min(candidate.percentage * 2, 100)}%`,
                      backgroundColor: getCandidateColor(index),
                      minWidth: '40px'
                    }}
                  >
                    {candidate.voteCount || 0} votes
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-medium text-gray-900">
                  {candidate.formattedPercentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render election information
  const renderElectionInfo = () => {
    if (!currentElection) return null;

    const now = new Date();
    const startTime = new Date(currentElection.startTime);
    const endTime = new Date(currentElection.endTime);
    const isElectionEnded = now > endTime;

    return (
      <div className="space-y-6">
        {/* Election Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Election Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border-2 ${
              'border-green-200 bg-green-50'
            }`}>
              <div className="text-sm font-medium text-gray-600">Voting Started</div>
              <div className="text-lg font-semibold text-gray-900">
                {startTime.toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-500">
                {startTime.toLocaleTimeString()}
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${
              isElectionEnded ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
            }`}>
              <div className="text-sm font-medium text-gray-600">Voting Ended</div>
              <div className="text-lg font-semibold text-gray-900">
                {endTime.toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-500">
                {endTime.toLocaleTimeString()}
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${
              currentElection.status === 'ResultDeclared' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-sm font-medium text-gray-600">Results Declared</div>
              <div className="text-lg font-semibold text-gray-900">
                {currentElection.status === 'ResultDeclared' ? 'Official' : 'Pending'}
              </div>
              <div className="text-sm text-gray-500">
                {currentElection.status === 'ResultDeclared' ? 'Final Results' : 'Not Yet Declared'}
              </div>
            </div>
          </div>
        </div>

        {/* Election Statistics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Election Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{currentElection.totalCandidates || 0}</div>
              <div className="text-sm text-blue-600 mt-1">Total Candidates</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{currentElection.totalVotes || 0}</div>
              <div className="text-sm text-green-600 mt-1">Total Votes</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {chartData?.participationRate.toFixed(1) || '0'}%
              </div>
              <div className="text-sm text-purple-600 mt-1">Participation Rate</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {currentElection.status === 'ResultDeclared' ? 'Final' : 'Unofficial'}
              </div>
              <div className="text-sm text-orange-600 mt-1">Result Status</div>
            </div>
          </div>
        </div>

        {/* User Vote Status */}
        {isConnected && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Participation</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {voteStatus ? 'You voted in this election' : 'You did not vote in this election'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {voteStatus ? 'Thank you for participating!' : 'Election has concluded'}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                voteStatus 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {voteStatus ? 'Voted' : 'Not Voted'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <MainLayout showSidebar={false}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  const showResults = currentElection.status === 'Ended' || currentElection.status === 'ResultDeclared';

  return (
    <MainLayout showSidebar={false}>
      {/* Confetti Styles */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        .confetti-particle {
          position: fixed;
          pointer-events: none;
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Election Results</h1>
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
                    {currentElection.totalCandidates || 0} candidates • {currentElection.totalVotes || 0} votes
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Availability Check */}
        {!showResults && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-yellow-800">Results Not Available</h3>
            </div>
            <p className="text-yellow-700 mb-4">
              Election results will be available after the voting period ends and results are declared.
            </p>
            <Link
              to={`/election/${id}`}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              View Election Details
            </Link>
          </div>
        )}

        {/* Results Content */}
        {showResults && (
          <>
            {/* Winner Announcement */}
            {renderWinnerAnnouncement()}

            {/* View Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'overview', name: 'Results Overview' },
                  { id: 'charts', name: 'Visual Charts' },
                  { id: 'info', name: 'Election Info' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeView === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div>
              {activeView === 'overview' && renderResultsOverview()}
              {activeView === 'charts' && renderChartsView()}
              {activeView === 'info' && renderElectionInfo()}
            </div>

            {/* Share Results */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Share These Results</h3>
                  <p className="text-gray-600">
                    Spread the word about the election outcomes with your community.
                  </p>
                </div>
                <div className="flex space-x-3 mt-4 md:mt-0">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                    Share on Twitter
                  </button>
                  <button className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ResultsPage;