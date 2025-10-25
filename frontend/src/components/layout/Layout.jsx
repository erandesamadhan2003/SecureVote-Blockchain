import React from "react";
import { useSelector, useDispatch } from "react-redux";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";
import Footer from "./Footer.jsx";
import { selectSidebarOpen, toggleSidebar } from "../../redux/slices/uiSlice.js";

/**
 * Layout wraps pages with Navbar, Sidebar and Footer
 * - reads sidebar state from redux (uiSlice)
 * - provides onClose handler for mobile sidebar
 */
export default function Layout({ children }) {
    const dispatch = useDispatch();
    const sidebarOpen = useSelector(selectSidebarOpen);

    const handleCloseSidebar = () => {
        dispatch(toggleSidebar());
    };

    return (
        <div className="min-h-screen bg-[var(--bg,#f5efe3)] text-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar (responsive) */}
                <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

                {/* Main content */}
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            <Footer />
        </div>
    );
}
