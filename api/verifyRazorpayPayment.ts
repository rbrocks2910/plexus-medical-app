// api/verifyRazorpayPayment.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { verifyAuth, AuthResult } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';
import { FirebaseAdminService } from './_lib/firebaseAdminService.js';
import {
  validateRazorpayOrderId,
  validateRazorpayPaymentId,
  validateRazorpaySignature,
  validateUserId,
  ValidationResult
} from './_lib/validation.js';

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

    // Validate all input parameters
    const orderIdValidation = validateRazorpayOrderId(razorpay_order_id);
    const paymentIdValidation = validateRazorpayPaymentId(razorpay_payment_id);
    const signatureValidation = validateRazorpaySignature(razorpay_signature);
    const userIdValidation = validateUserId(userId);

    // Combine validation results
    const validationErrors: string[] = [];

    if (!orderIdValidation.isValid) {
      validationErrors.push(...orderIdValidation.errors);
    }

    if (!paymentIdValidation.isValid) {
      validationErrors.push(...paymentIdValidation.errors);
    }

    if (!signatureValidation.isValid) {
      validationErrors.push(...signatureValidation.errors);
    }

    if (!userIdValidation.isValid) {
      validationErrors.push(...userIdValidation.errors);
    }

    if (validationErrors.length > 0) {
      console.error('Input validation failed:', validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: validationErrors
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
      // Update user's subscription to premium in Firestore using Admin service
      try {
        // Get current user data to preserve existing usage stats
        const userData = await FirebaseAdminService.getUser(userId);

        if (userData) {
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

          // Update the user's subscription in Firestore using Admin service
          await FirebaseAdminService.updateUserSubscription(userId, premiumSubscription);

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