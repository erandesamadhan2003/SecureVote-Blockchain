import React from 'react';

import './App.css';

function App() {

  return (
    <h1 className='text-3xl font-bold'>Hello</h1>
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