// api/createRazorpayOrder.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { verifyAuth, AuthResult } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';
import {
  validateUserId,
  validateAmount,
  validateCurrency,
  validatePlan,
  ValidationResult
} from './_lib/validation.js';

// Debug logging to check if environment variables are accessible
console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
console.log('RAZORPAY_KEY_ID length:', process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.length : 'undefined');
console.log('RAZORPAY_KEY_SECRET length:', process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 'undefined');

// Validate that environment variables exist before creating Razorpay instance
if (!process.env.RAZORPAY_KEY_ID) {
  console.error('Missing RAZORPAY_KEY_ID environment variable');
}
if (!process.env.RAZORPAY_KEY_SECRET) {
  console.error('Missing RAZORPAY_KEY_SECRET environment variable');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting - limit to 5 requests per minute per IP for payment creation
  const rateLimitResult = await rateLimit(req, 60 * 1000, 5); // 5 requests per minute
  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
      resetTime: rateLimitResult.resetTime
    });
  }

  // Verify authentication
  const authResult: AuthResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing authentication token'
    });
  }

  // Check environment variables before processing
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Razorpay credentials are missing');
    return res.status(500).json({
      error: 'Payment configuration error: Missing API credentials',
      details: 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not found'
    });
  }

  try {
    const { amount, currency, plan, userId } = req.body as {
      amount?: number;
      currency: string;
      plan: string;
      userId: string;
    };

    // Verify that the authenticated user matches the userId in the request
    if (authResult.uid !== userId) {
      console.error(`User ID mismatch: token UID ${authResult.uid} !== request UID ${userId}`);
      return res.status(403).json({
        error: 'Forbidden: User ID does not match authenticated user'
      });
    }

    // Set default amount based on the plan if not provided
    // Currently, the Plus plan is ₹300 (30000 paise)
    const planAmounts: Record<string, number> = {
      'plus': 30000, // ₹300 in paise
    };

    const finalAmount = amount ?? planAmounts[plan];
    const finalCurrency = currency || 'INR';
    const finalPlan = plan || 'plus';

    // Validate inputs
    const userIdValidation = validateUserId(userId);
    const amountValidation = validateAmount(finalAmount);
    const currencyValidation = validateCurrency(finalCurrency);
    const planValidation = validatePlan(finalPlan);

    console.log('Validation results:', {
      userId: { value: userId, validation: userIdValidation },
      amount: { value: finalAmount, validation: amountValidation },
      currency: { value: finalCurrency, validation: currencyValidation },
      plan: { value: finalPlan, validation: planValidation }
    });

    // Combine validation results
    const validationErrors: string[] = [];

    if (!userIdValidation.isValid) {
      validationErrors.push(...userIdValidation.errors);
    }

    if (!amountValidation.isValid) {
      validationErrors.push(...amountValidation.errors);
    }

    if (!currencyValidation.isValid) {
      validationErrors.push(...currencyValidation.errors);
    }

    if (!planValidation.isValid) {
      validationErrors.push(...planValidation.errors);
    }

    if (validationErrors.length > 0) {
      console.error('Validation failed:', validationErrors);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Generate a shorter unique receipt ID within the 40-character limit
    const timestamp = Date.now().toString().slice(-6); // Take last 6 digits of timestamp
    const userIdShort = userId.length > 20 ? userId.substring(0, 20) : userId; // Truncate userId if too long
    const receiptId = `receipt_${userIdShort}_${timestamp}`.substring(0, 40); // Ensure total length <= 40

    const options = {
      amount: finalAmount, // in paise (₹300 => 30000)
      currency: finalCurrency,
      receipt: receiptId,
      notes: {
        plan: finalPlan,
        userId,
      },
    };

    console.log('Creating Razorpay order with receipt:', receiptId);
    const order = await razorpay.orders.create(options);

    // order has: id, amount, currency, status, etc.
    return res.status(200).json(order);
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err);
    return res.status(500).json({
      error: 'Failed to create order',
      details: err?.message || err?.toString(),
    });
  }
}
