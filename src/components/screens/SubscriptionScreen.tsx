/**
 * @file SubscriptionScreen.tsx
 * @description Screen for managing user subscription plans with a clean, subtle aesthetic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { auth } from '../../services/firebase';

// --- Type Definitions ---

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact?: string;
  };
  theme?: {
    color: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: any) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

// --- Utilities ---

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    
    // Prevent duplicate scripts
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
       // If it exists but window.Razorpay isn't ready, we might need to wait, 
       // but for simplicity, we'll assume it's loading and just add a listener or simplistic timeout.
       // A proper implementation might check readiness. Here we just resolve true and let the init fail if not ready.
       resolve(true); 
       return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true; // Use async loading
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

  // Safety check for unmounted component
  const [isMounted, setIsMounted] = useState(true);
  useEffect(() => {
    return () => setIsMounted(false);
  }, []);

  const handleSubscribe = useCallback(async () => {
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
        throw new Error('Failed to load payment gateway. Please check your connection.');
      }

      // 2. Get Token
      if (!auth || !auth.currentUser) throw new Error('Authentication lost. Please log in again.');
      const idToken = await auth.currentUser.getIdToken();

      // 3. Create Order
      // NOTE: We don't send 'amount' here. The backend should determine price based on 'plan'.
      const orderRes = await fetch('/api/createRazorpayOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          plan: 'plus',
          currency: 'INR',
          userId: user.uid,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initialize payment.');
      }

      const orderData = await orderRes.json();

      // 4. Configure Options
      const options: RazorpayOptions = {
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
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            // Verify Payment
            if (!auth || !auth.currentUser) throw new Error('User session expired.');
            const verifyToken = await auth.currentUser.getIdToken();

            const verifyRes = await fetch('/api/verifyRazorpayPayment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${verifyToken}`
              },
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
              throw new Error(verifyData.message || 'Payment verification failed.');
            }

            // Update Local State
            await subscribeToPremium();
            if (isMounted) navigate('/');

          } catch (err: any) {
            console.error('Verification error:', err);
            if (isMounted) setError(err.message || 'Payment verification failed.');
          } finally {
            if (isMounted) setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            if (isMounted) setIsLoading(false);
          },
        },
      };

      // 5. Open Checkout
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', (resp: any) => {
        if (isMounted) {
            setError(resp.error.description || 'Payment failed.');
            setIsLoading(false);
        }
      });

      rzp.open();

    } catch (err: any) {
      console.error('Subscription error:', err);
      if (isMounted) {
        setError(err.message || 'An unexpected error occurred.');
        setIsLoading(false);
      }
    }
  }, [user, navigate, subscribeToPremium, isMounted]);

  const handleGoBack = () => navigate('/');

  if (!user) {
    return ( /* ... (Access Denied View) ... */ 
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-900 text-white">
          Access Denied
      </div>
    );
  }

  const isPremium = user.usageStats?.subscription?.tier === 'premium';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-plexus-blue to-plexus-accent relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-4xl z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-md">Plus Plan</h1>
          <p className="text-white/80 max-w-md mx-auto">
            Unlock unlimited potential with our premium features
          </p>
        </div>

        <div className="flex justify-center">
          <Card
            className={`bg-white/95 backdrop-blur-xl p-8 relative overflow-hidden shadow-2xl transition-all duration-300 ${
              isPremium ? 'ring-4 ring-green-500/50 scale-105' : 'border border-white/20 hover:shadow-plexus-glow'
            }`}
            style={{ maxWidth: '400px' }}
          >
            {isPremium && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-8 py-1 transform rotate-45 translate-x-8 translate-y-4 shadow-sm">
                ACTIVE
              </div>
            )}
            
            {/* Header Accent */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-2 mt-2">Plus</h2>
            <div className="flex items-end mb-6">
              <span className="text-4xl font-extrabold text-gray-900">₹300</span>
              <span className="text-gray-500 ml-1 mb-1 font-medium">/month</span>
            </div>

            <div className="h-px bg-gray-200 mb-6 w-full"></div>

            <ul className="space-y-4 mb-8 text-left">
              {[
                'Unlimited Case Generation',
                'Advanced AI Feedback',
                'Priority Support',
                'Detailed Analytics'
              ].map((feature, i) => (
                <li key={i} className="flex items-center text-gray-700">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            {!isPremium ? (
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed opacity-80' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-500/30'
                }`}
              >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </span>
                ) : 'Upgrade Now'}
              </button>
            ) : (
              <button
                disabled={true}
                className="w-full bg-green-50/50 border border-green-200 text-green-700 font-semibold py-3 px-4 rounded-xl text-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Current Plan
              </button>
            )}
          </Card>
        </div>

        {error && (
          <div className="mt-6 mx-auto max-w-md bg-red-50/90 backdrop-blur border border-red-200 rounded-lg p-3 flex items-start gap-3 animate-fade-in-up">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p className="text-red-600 text-sm font-medium text-left">{error}</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <button
            onClick={handleGoBack}
            className="group flex items-center justify-center mx-auto text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};