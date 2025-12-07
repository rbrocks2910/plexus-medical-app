// api/verifyRazorpayPayment.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
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

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay params' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET as string;
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const success = expectedSignature === razorpay_signature;

    if (!success) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // ✅ At this point payment is verified.
    // Here you *could* also:
    //   - log payment to Firestore
    //   - mark "paymentCompleted" flag, etc.
    // We let the frontend call subscribeToPremium() after this.

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error verifying Razorpay payment:', err);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
}
