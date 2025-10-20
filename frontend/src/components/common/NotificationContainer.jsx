import React from 'react';
import { useUI } from '../../hooks';

const NotificationContainer = () => {
    const { notifications, hideNotification } = useUI();

    const getNotificationStyles = (type) => {
        const baseStyles = "max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden";

        const typeStyles = {
            success: "border-l-4 border-green-500",
            error: "border-l-4 border-red-500",
            warning: "border-l-4 border-yellow-500",
            info: "border-l-4 border-blue-500",
        };

        return `${baseStyles} ${typeStyles[type] || typeStyles.info}`;
    };

    const getIcon = (type) => {
        const iconClasses = "w-5 h-5";

        switch (type) {
            case 'success':
                return (
                    <svg className={`${iconClasses} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className={`${iconClasses} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className={`${iconClasses} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                );
            default:
                return (
                    <svg className={`${iconClasses} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-20 right-4 z-50 space-y-3">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={getNotificationStyles(notification.type)}
                >
                    <div className="p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                {getIcon(notification.type)}
                            </div>
                            <div className="ml-3 w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    {notification.message}
                                </p>
                                {notification.description && (
                                    <p className="mt-1 text-sm text-gray-500">
                                        {notification.description}
                                    </p>
                                )}
                            </div>
                            <div className="ml-4 flex-shrink-0 flex">
                                <button
                                    onClick={() => hideNotification(notification.id)}
                                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationContainer;