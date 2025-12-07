/**
 * @file UserMenu.tsx
 * @description User menu component showing user info, usage stats, and logout functionality.
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const UserMenu: React.FC = () => {
  const { user, signOut, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="relative">
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <img
          src={user.photoURL || '/default-avatar.png'}
          alt={user.displayName || 'User'}
          className="w-8 h-8 rounded-full border-2 border-white/30"
        />
        <span className="text-white text-sm font-medium hidden sm:block">
          {user.displayName || user.email}
        </span>
        <svg
          className={`w-4 h-4 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50">
            {/* User Info Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <img
                  src={user.photoURL || '/default-avatar.png'}
                  alt={user.displayName || 'User'}
                  className="w-12 h-12 rounded-full border-2 border-plexus-blue"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {user.displayName || 'Anonymous User'}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <p className="text-xs text-gray-400">
                    Member since {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="p-4 border-b border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Usage Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Cases Today</p>
                  <p className="font-medium text-plexus-blue">
                    {user.usageStats.casesGeneratedToday}/50
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Cases This Week</p>
                  <p className="font-medium text-plexus-blue">
                    {user.usageStats.casesGeneratedThisWeek}/200
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Cases</p>
                  <p className="font-medium text-plexus-blue">
                    {user.usageStats.totalCasesGenerated}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">API Requests Today</p>
                  <p className="font-medium text-plexus-blue">
                    {user.usageStats.apiRequestsToday}/5000
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="p-2">
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
