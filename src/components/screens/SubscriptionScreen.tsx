/**
 * @file SubscriptionScreen.tsx
 * @description Screen for managing user subscription plans with a clean, subtle aesthetic.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Load Razorpay checkout script
const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID ||
  (process.env.REACT_APP_RAZORPAY_KEY_ID as string) ||
  '';

export const SubscriptionScreen: React.FC = () => {
  const { user, subscribeToPremium } = useAuth();
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
      // 1. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Failed to load payment gateway. Please try again.');
        setIsLoading(false);
        return;
      }

      // 2. Create order via backend
      const orderRes = await fetch('/api/createRazorpayOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'plus',
          amount: 30000, // ₹300 in paise
          currency: 'INR',
          userId: user.uid,
        }),
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderRes.json();

      // 3. Configure Razorpay options
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Plexus Premium',
        description: 'Plus Plan - Monthly Subscription',
        order_id: orderData.id,
        prefill: {
          name: user.displayName || 'Plexus User',
          email: user.email || '',
        },
        theme: {
          color: '#2563EB',
        },
        handler: async (response: any) => {
          try {
            // 4. Verify payment with backend
            const verifyRes = await fetch('/api/verifyRazorpayPayment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: 'plus',
                userId: user.uid,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(
                verifyData?.message ||
                  'Payment verification failed. If amount was debited, please contact support.'
              );
            }

            // 5. Upgrade user to premium in Firestore
            await subscribeToPremium();

            navigate('/');
          } catch (err) {
            console.error('Verification error:', err);
            setError(
              err instanceof Error
                ? err.message
                : 'Payment verification failed. Please try again.'
            );
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (resp: any) => {
        console.error('Payment failed:', resp.error);
        setError(resp.error.description || 'Payment failed. Please try again.');
        setIsLoading(false);
      });

      // 6. Open Razorpay checkout
      rzp.open();
    } catch (err) {
      console.error('Error during subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
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
          <h1 className="text-4xl font-bold text-white mb-2">Plus Plan</h1>
          <p className="text-white/80 max-w-md mx-auto">
            {'Unlock unlimited potential with our premium features'}
          </p>
        </div>

        <div className="flex justify-center">
          <Card
            className={`bg-white/90 backdrop-blur-md p-6 relative overflow-hidden ${
              isPremium ? 'ring-2 ring-green-500/50' : 'border-2 border-white/30'
            }`}
          >
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
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <span>Higher case limits</span>
              </li>
              <li className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <span>Full feature access</span>
              </li>
            </ul>
            {!isPremium ? (
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className={`w-full ${
                  isLoading ? 'bg-plexus-blue/70 cursor-wait' : 'bg-plexus-blue hover:bg-plexus-blue-dark'
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
