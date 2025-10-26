import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import store from "./redux/store.js";

// Pages (existing in repo)
import HomePage from "./pages/HomePage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProfilePage from "./pages/profile/ProfilePage.jsx";
import Settings from "./pages/profile/Settings.jsx";
import AllElections from "./pages/elections/AllElections.jsx";
import ElectionDetail from "./pages/elections/ElectionDetail.jsx";
import MyElections from "./pages/elections/MyElections.jsx";
import CreateElection from "./pages/elections/CreateElection.jsx";
import CandidateProfile from "./pages/candidates/CandidateProfile.jsx";
import RegisterCandidate from "./pages/candidates/RegisterCandidate.jsx";
import ManageCandidates from "./pages/candidates/ManageCandidates.jsx";
import VotePage from "./pages/voting/VotePage.jsx";
import ResultsPage from "./pages/results/ResultsPage.jsx";
import Analytics from "./pages/results/Analytics.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import UserManagementPage from "./pages/admin/UserManagementPage.jsx";
import SystemSettings from "./pages/admin/SystemSettings.jsx";

// Helpers / components
import Navbar from "./components/layout/Navbar.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

// Lightweight ErrorBoundary and ToastContainer to avoid extra dependencies
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null };
	}
	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}
	componentDidCatch(error, info) {
		console.error("Unhandled error:", error, info);
	}
	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center">
					<div className="bg-white p-6 rounded shadow text-center">
						<h2 className="text-xl font-semibold">Something went wrong</h2>
						<p className="text-sm text-gray-600 mt-2">{String(this.state.error)}</p>
						<a href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">Go Home</a>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}

// Very small ToastContainer placeholder — replace with react-toastify if desired
const ToastContainer = () => null;

// Simple Layout wrapper using existing Navbar
const Layout = ({ children }) => (
	<div className="min-h-screen bg-slate-50">
		<Navbar />
		<main>{children}</main>
	</div>
);

// Simple placeholders (replace with real components if available)
const NotFoundPage = () => (
	<div className="min-h-[60vh] flex items-center justify-center">
		<div className="text-center">
			<h1 className="text-4xl font-bold">404</h1>
			<p className="text-sm text-gray-600">Page not found</p>
			<a href="/" className="text-blue-600 underline">Go Home</a>
		</div>
	</div>
);

const RegisterVoters = () => (
	<div className="p-6 text-center text-gray-600">Register Voters page (placeholder)</div>
);

const VotingHistory = () => (
	<div className="p-6 text-center text-gray-600">Voting History (placeholder)</div>
);

export default function App() {
	return (
		<Provider store={store}>
			<BrowserRouter>
				<ErrorBoundary>
					<Layout>
						<Routes>
							{/* Public */}
							<Route path="/" element={<HomePage />} />

							{/* Protected (any authenticated user) */}
							<Route element={<ProtectedRoute />}>
								<Route path="/dashboard" element={<Dashboard />} />
								<Route path="/profile" element={<ProfilePage />} />
								<Route path="/settings" element={<Settings />} />

								{/* Election routes */}
								<Route path="/elections" element={<AllElections />} />
								<Route path="/elections/:electionId" element={<ElectionDetail />} />
								<Route path="/my-elections" element={<MyElections />} />

								{/* Candidate */}
								<Route path="/candidates/register" element={<RegisterCandidate />} />
								<Route path="/candidates/:candidateId" element={<CandidateProfile />} />

								{/* Voting */}
								<Route path="/vote/:electionId" element={<VotePage />} />
								<Route path="/my-votes" element={<VotingHistory />} />

								{/* Results */}
								<Route path="/results/:electionId" element={<ResultsPage />} />
							</Route>

							{/* Manager-only */}
							<Route element={<ProtectedRoute requiredRole="ELECTION_MANAGER" />}>
								<Route path="/elections/create" element={<CreateElection />} />
								<Route path="/candidates/manage" element={<ManageCandidates />} />
								<Route path="/voters/register" element={<RegisterVoters />} />
								<Route path="/analytics/:electionId" element={<Analytics />} />
							</Route>

							{/* Authority */}
							<Route element={<ProtectedRoute requiredRole="ELECTION_AUTHORITY" />}>
								<Route path="/candidates/manage" element={<ManageCandidates />} />
								<Route path="/voters/register" element={<RegisterVoters />} />
							</Route>

							{/* Super Admin */}
							<Route element={<ProtectedRoute requiredRole="SUPER_ADMIN" />}>
								<Route path="/admin/dashboard" element={<AdminDashboard />} />
								<Route path="/admin/users" element={<UserManagementPage />} />
								<Route path="/admin/settings" element={<SystemSettings />} />
							</Route>

							{/* Fallback 404 */}
							<Route path="*" element={<NotFoundPage />} />
						</Routes>
					</Layout>

					{/* Global Toasts */}
					<ToastContainer />
				</ErrorBoundary>
			</BrowserRouter>
		</Provider>
	);
}