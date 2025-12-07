// api/createRazorpayOrder.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, currency, plan, userId } = req.body as {
      amount: number;
      currency: string;
      plan: string;
      userId: string;
    };

    if (!amount || !userId) {
      return res.status(400).json({ error: 'Missing amount or userId' });
    }

    const options = {
      amount, // in paise (₹300 => 30000)
      currency: currency || 'INR',
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: {
        plan,
        userId,
      },
    };

    const order = await razorpay.orders.create(options);

    // order has: id, amount, currency, status, etc.
    return res.status(200).json(order);
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err);
    return res.status(500).json({
      error: 'Failed to create order',
      details: err?.message,
    });
  }
}
