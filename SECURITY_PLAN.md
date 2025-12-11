# Security Enhancement Plan for Plexus Medical Training Simulator

This document outlines a comprehensive security improvement plan for the Plexus Medical Training Simulator application, addressing identified vulnerabilities and providing actionable steps to enhance the application's security posture.

## Current Security Assessment

The application currently has a medium security level with several vulnerabilities that need to be addressed. The main concerns include client-side API key exposure, insufficient server-side authentication validation, and potentially permissive Firestore security rules.

## Detailed Security Enhancement Plan

### 1. Strengthen Firestore Security Rules

**Current Risk**: If Firestore security rules are too permissive, users could access or modify other users' data.

**Implementation Steps**:

1.1 **Review Current Security Rules**:
- Examine existing `firestore.rules` file
- Identify any overly permissive rules (e.g., `allow read, write: if true;`)

1.2 **Implement User-Specific Access Control**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Case data access restricted to owner
    match /cases/{caseId} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == resource.data.ownerId;
    }
    
    // Past cases limited to user
    match /past-cases/{document} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == resource.data.userId;
    }
  }
}
```

1.3 **Test Rule Implementation**:
- Create test scenarios to verify rules work as expected
- Ensure authenticated users can access only their own data
- Verify unauthenticated users cannot access any user data

1.4 **Implement Deny-by-Default Policy**:
- Start with restrictive rules and gradually allow specific access
- Use functions to avoid code duplication in complex rules

### 2. Add Authentication Checks to Serverless Functions

**Current Risk**: API functions don't validate users before processing requests, potentially allowing unauthorized access.

**Implementation Steps**:

2.1 **Create Authentication Middleware**:
```typescript
// api/_lib/auth.ts
import { VercelRequest } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      // Use service account key from environment variables
      // Store service account key as environment variables
    })
  });
}

export const verifyAuth = async (req: VercelRequest) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { authenticated: true, uid: decodedToken.uid, error: null };
  } catch (error) {
    return { authenticated: false, error: 'Invalid token' };
  }
};
```

2.2 **Update All API Functions**:
```typescript
// Example for verifyRazorpayPayment.ts
import { verifyAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add authentication check at the beginning
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Continue with existing logic, using authResult.uid to verify user ownership
  // Ensure the userId in the request matches the authenticated user ID
  if (userId !== authResult.uid) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  // Rest of the function logic...
}
```

2.3 **Update All API Endpoints**:
- Apply authentication middleware to all API functions
- Verify user identity matches resource ownership
- Add appropriate error responses for unauthenticated requests

### 3. Implement Rate Limiting

**Current Risk**: Without rate limiting, the application is vulnerable to abuse and denial-of-service attacks.

**Implementation Steps**:

3.1 **Choose Rate Limiting Solution**:
- Option A: Use Redis for distributed rate limiting
- Option B: Use Vercel's built-in rate limiting
- Option C: Use a third-party service like Cloudflare

3.2 **Implement Basic Rate Limiting**:
```typescript
// api/_lib/rateLimit.ts
import { VercelRequest } from '@vercel/node';

const rateLimit = async (req: VercelRequest, maxRequests: number, windowMs: number) => {
  const clientIP = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  // In production, use a distributed store like Redis or a NoSQL database
  // For Vercel, consider using a third-party service or Firestore
  const key = `rate-limit:${clientIP}`;
  
  // Implementation would depend on storage solution
  // This is a simplified example
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Check and update request count for this client
  // Return true if request is allowed, false if rate limit exceeded
  return true; // Simplified for example
};

export default rateLimit;
```

3.3 **Apply Rate Limiting to Sensitive Endpoints**:
```typescript
// Apply to payment, authentication, and data creation endpoints
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add rate limiting check
  if (!(await rateLimit(req, 10, 60 * 1000))) { // 10 requests per minute
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  // Continue with function logic...
}
```

### 4. Consider Firebase Admin SDK for Server-Side Operations

**Current Risk**: Using client-side Firebase SDK in serverless functions may not be optimal for security.

**Implementation Steps**:

4.1 **Set Up Firebase Admin SDK**:
```bash
npm install firebase-admin
```

4.2 **Create Service Account**:
- Go to Firebase Console → Project Settings → Service Accounts
- Generate a new private key
- Store the key securely in environment variables

4.3 **Update Server-Side Functions**:
```typescript
// api/_lib/firebaseAdmin.ts
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with service account
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
```

4.4 **Replace Client-Side Firebase Calls in API Functions**:
```typescript
// Update verifyRazorpayPayment.ts to use Admin SDK
import { db } from '../_lib/firebaseAdmin';

// Update Firestore operations to use admin SDK instead of client SDK
const userDocRef = db.collection('users').doc(userId);
```

### 5. Implement Comprehensive Input Validation

**Current Risk**: Insufficient input validation could lead to injection attacks or invalid data processing.

**Implementation Steps**:

5.1 **Create Input Validation Utilities**:
```typescript
// src/lib/validation.ts
export const validateUserId = (userId: string): boolean => {
  return typeof userId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(userId);
};

export const validateAmount = (amount: number): boolean => {
  return typeof amount === 'number' && amount > 0 && Number.isInteger(amount);
};

export const validatePlan = (plan: string): boolean => {
  const validPlans = ['free', 'premium', 'enterprise'];
  return validPlans.includes(plan);
};

export const validateCaseId = (caseId: string): boolean => {
  return typeof caseId === 'string' && caseId.length > 0 && caseId.length < 100;
};
```

5.2 **Apply Validation to All API Endpoints**:
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Existing auth check...
  
  // Validate input data
  const { amount, currency, plan, userId } = req.body;
  
  if (!validateUserId(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }
  
  if (!validateAmount(amount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  
  if (!validatePlan(plan)) {
    return res.status(400).json({ error: 'Invalid plan type' });
  }
  
  // Continue with function logic...
}
```

5.3 **Sanitize All User Inputs**:
- Use proper escaping for database queries
- Implement schema validation using libraries like Zod
- Validate content types and lengths

## Implementation Priority

1. **High Priority**: Implement authentication checks in API functions and strengthen Firestore security rules
2. **Medium Priority**: Add comprehensive input validation
3. **Low Priority**: Consider Firebase Admin SDK migration and implement rate limiting

## Testing and Validation

After implementing each security measure:
1. Conduct thorough testing to ensure functionality remains intact
2. Test edge cases where security measures might be bypassed
3. Verify authentication and authorization work as expected
4. Monitor application logs for any new security-related issues

## Monitoring and Maintenance

- Regularly review and update security rules
- Monitor for new security vulnerabilities in dependencies
- Audit authentication tokens and access patterns
- Keep all dependencies up to date