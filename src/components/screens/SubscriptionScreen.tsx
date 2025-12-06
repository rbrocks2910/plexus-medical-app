/**
 * @file SubscriptionScreen.tsx
 * @description Screen for managing user subscription plans with a clean, subtle aesthetic.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';

export const SubscriptionScreen: React.FC = () => {
  const { user, subscribeToPremium, updateSubscription } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would redirect to your payment gateway
      // For now, we'll just simulate the subscription process
      await subscribeToPremium();

      // In a real implementation, you would redirect to the payment provider
      // and handle success/failure callbacks
      console.log('Redirecting to payment gateway...');

      // For demo purposes, we'll just show a success message
      // In a real app, you might navigate back to home or show confirmation
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-plexus-blue to-plexus-accent">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Please log in to view subscription options.</p>
        </div>
      </div>
    );
  }

  const isPremium = user.usageStats.subscription?.tier === 'premium';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-plexus-blue to-plexus-accent relative overflow-hidden">
      {/* Add subtle background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Subscription Plans</h1>
          <p className="text-white/80 max-w-md mx-auto">
            {isPremium
              ? "Thank you for your Plus subscription."
              : "Choose the plan that fits your needs."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Free Plan Card */}
          <Card className={`bg-white/90 backdrop-blur-md p-6 relative overflow-hidden ${
            !isPremium ? 'ring-2 ring-plexus-blue/50' : 'opacity-90'
          }`}>
            <div className="absolute top-0 right-0 bg-plexus-blue text-white text-xs font-bold px-4 py-1 transform rotate-45 translate-x-4 -translate-y-4">
              Current
            </div>
            <h2 className="text-2xl font-bold text-plexus-blue mb-4">Basic</h2>
            <div className="mb-6">
              <span className="text-3xl font-bold text-gray-800">Free</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Access to core features</span>
              </li>
            </ul>
            <button
              disabled={true}
              className="w-full bg-gray-100 text-gray-500 font-medium py-3 px-4 rounded-lg text-lg transition-all duration-300 disabled:cursor-not-allowed"
            >
              Current Plan
            </button>
          </Card>

          {/* Premium Plan Card */}
          <Card className={`bg-white/90 backdrop-blur-md p-6 relative overflow-hidden ${
            isPremium ? 'ring-2 ring-green-500/50' : 'border-2 border-white/30'
          }`}>
            {isPremium && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1 transform rotate-45 translate-x-4 -translate-y-4">
                Active
              </div>
            )}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
            <h2 className="text-2xl font-bold text-plexus-blue mb-4">Plus</h2>
            <div className="mb-6">
              <span className="text-3xl font-bold text-gray-800">₹300</span>
              <span className="text-gray-500">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Higher case limits</span>
              </li>
            </ul>
            {!isPremium ? (
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className={`w-full ${
                  isLoading ? 'bg-plexus-blue/70' : 'bg-plexus-blue hover:bg-plexus-blue-dark'
                } text-white font-bold py-3 px-4 rounded-lg text-lg transition-all duration-300 ease-plexus-ease transform hover:scale-105`}
              >
                {isLoading ? 'Processing...' : 'Upgrade to Plus'}
              </button>
            ) : (
              <button
                disabled={true}
                className="w-full bg-green-500 text-white font-medium py-3 px-4 rounded-lg text-lg transition-all duration-300 disabled:cursor-not-allowed"
              >
                Active Plan
              </button>
            )}
          </Card>
        </div>

        {error && (
          <div className="mt-6 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        <div className="mt-10 text-center">
          <button
            onClick={handleGoBack}
            className="px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-md text-white font-medium transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};