import { VercelRequest } from '@vercel/node';

// Simple rate limiting using a Map for in-memory storage
// In production, use a distributed store like Redis or a database
class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  // Default limits (can be customized per endpoint)
  private defaultWindowMs: number = 60 * 1000; // 1 minute
  private defaultMax: number = 10; // 10 requests per window

  constructor() {
    // Clean up old entries periodically to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.requests.entries()) {
        if (now > value.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  async checkLimit(
    req: VercelRequest, 
    windowMs: number = this.defaultWindowMs, 
    max: number = this.defaultMax
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const clientKey = this.getClientKey(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    let requestInfo = this.requests.get(clientKey);
    
    if (!requestInfo || now > requestInfo.resetTime) {
      // New window - reset the counter
      requestInfo = { count: 1, resetTime: now + windowMs };
      this.requests.set(clientKey, requestInfo);
      return { allowed: true, remaining: max - 1, resetTime: requestInfo.resetTime };
    }

    if (requestInfo.count >= max) {
      // Rate limit exceeded
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: requestInfo.resetTime 
      };
    }

    // Increment the counter
    requestInfo.count++;
    this.requests.set(clientKey, requestInfo);
    
    return { 
      allowed: true, 
      remaining: max - requestInfo.count, 
      resetTime: requestInfo.resetTime 
    };
  }

  private getClientKey(req: VercelRequest): string {
    // Create a unique key based on IP address and User-Agent
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return `${ip}-${userAgent}`;
  }
}

// Export a single instance to maintain state across function invocations in the same container
export const rateLimiter = new InMemoryRateLimiter();

/**
 * Rate limiting middleware for Vercel serverless functions
 */
export const rateLimit = async (
  req: VercelRequest,
  windowMs: number = 60 * 1000, // 1 minute
  max: number = 10 // 10 requests
) => {
  const result = await rateLimiter.checkLimit(req, windowMs, max);
  return result;
};