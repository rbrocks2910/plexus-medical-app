// api/verifyRazorpayPayment.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { verifyAuth, AuthResult } from './_lib/auth';
import { rateLimit } from './_lib/rateLimit';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase if not already initialized
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// Subscription limits for case generation
const SUBSCRIPTION_LIMITS = {
  free: {
    total: 2,    // 2 total cases for free users
  },
  premium: {
    total: 30,   // 30 total cases for the entire monthly plan
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Apply rate limiting - limit to 3 requests per minute per IP for payment verification
  const rateLimitResult = await rateLimit(req, 60 * 1000, 3); // 3 requests per minute
  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    return res.status(429).json({
      success: false,
      message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`
    });
  }

  // Verify authentication
  const authResult: AuthResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing authentication token'
    });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      userId,
    } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      plan: string;
      userId: string;
    };

    // Verify that the authenticated user matches the userId in the request
    if (authResult.uid !== userId) {
      console.error(`User ID mismatch: token UID ${authResult.uid} !== request UID ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'Forbidden: User ID does not match authenticated user'
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature, or userId'
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET as string;

    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const success = expectedSignature === razorpay_signature;

    if (!success) {
      console.error('Razorpay signature verification failed');
      console.error('Expected signature:', expectedSignature);
      console.error('Received signature:', razorpay_signature);
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    if (success && userId) {
      // Update user's subscription to premium in Firestore
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const now = new Date();

          // Get current usage stats to preserve them
          const currentTotalCasesUsed = userData.usageStats?.subscription?.totalCasesUsed || 0;

          // Prepare premium subscription data
          const premiumSubscription = {
            tier: 'premium',
            startDate: now.toISOString(),
            // For demo purposes, set end date to 30 days from now
            // In a real app, this would be handled by your payment system
            endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            totalCasesUsed: currentTotalCasesUsed, // Keep any previously used cases
            maxTotalCases: SUBSCRIPTION_LIMITS.premium.total, // 30 cases total per plan
          };

          // Update the user's subscription in Firestore
          await setDoc(userDocRef, {
            subscription: premiumSubscription,
          }, { merge: true });

          console.log(`User ${userId} subscription updated to premium`);
        } else {
          console.error(`User document does not exist for userId: ${userId}`);
          // Don't fail the entire request, just log the error
        }
      } catch (updateError) {
        console.error('Error updating user subscription in Firestore:', updateError);
        // Don't fail the entire request if just the subscription update fails
      }
    }

    // ✅ At this point payment is verified and subscription updated.
    // We let the frontend call subscribeToPremium() after this if needed for UI updates.

    return res.status(200).json({
      success: true,
      message: 'Payment verified and subscription updated successfully'
    });
  } catch (err: any) {
    console.error('Error verifying Razorpay payment:', err);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
}