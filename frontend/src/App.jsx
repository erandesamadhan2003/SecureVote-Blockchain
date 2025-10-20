import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useWallet } from './hooks';
import { Home, Dashboard, ElectionDetail, VotingPage } from './pages';
import EventListeners from './pages/admin/EventListeners';
import './App.css';

function App() {
  const { isConnected } = useWallet();

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route path="/dashboard" element={isConnected ? <Dashboard /> : <Home />} />

          <Route path="/election/:id" element={<ElectionDetail />} />

          <Route path="/election/:id/vote" element={<VotingPage />} />

          <Route path="/admin/event-listeners" element={<EventListeners />} />
                    
          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

// Simple 404 component
const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <a 
          href="/" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
        >
          Go Home
        </a>
      </div>
    </div>
  );
};

export default App;