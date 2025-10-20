import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import TransactionModal from '../common/TransactionModal';
import NotificationContainer from '../common/NotificationContainer';

const MainLayout = ({ children, showSidebar = false }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <Header />

            {/* Main Content Area */}
            <div className="flex flex-1">
                {/* Sidebar */}
                {showSidebar && (
                    <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
                )}

                {/* Main Content */}
                <main className={`flex-1 ${showSidebar ? 'lg:ml-0' : ''}`}>
                    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>

            {/* Footer */}
            <Footer />

            {/* Global Components */}
            <TransactionModal />
            <NotificationContainer />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && showSidebar && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={closeSidebar}
                ></div>
            )}
        </div>
    );
};

export default MainLayout;