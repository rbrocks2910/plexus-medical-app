/**
 * Input validation utilities for the Plexus Medical Training Simulator
 * Provides comprehensive validation for all input data to prevent injection attacks
 * and ensure data integrity
 */

// Regular expressions for validation
const REGEX = {
  // Firebase user ID format (alphanumeric, hyphens, underscores, 1-128 characters)
  userId: /^[a-zA-Z0-9_-]{1,128}$/,
  
  // Email validation
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Names validation (letters, spaces, hyphens, apostrophes)
  name: /^[a-zA-Z\s\-'\.]{1,100}$/,
  
  // Phone number (basic validation for international format)
  phone: /^[+]?[0-9\s\-\(\)]{7,20}$/,
  
  // Alpha-numeric with some special characters for general text
  alphanumeric: /^[a-zA-Z0-9\s\-_.,!?;:'"(){}[\]|@#$%^&*+=<>~`]{1,1000}$/,
  
  // Case ID format
  caseId: /^[a-zA-Z0-9_-]{1,100}$/,
  
  // Payment-related formats
  razorpayId: /^[a-zA-Z0-9_]{1,100}$/,
  
  // Specialty and other categorical values
  specialty: /^[a-zA-Z0-9\s\-_.,'()]{1,100}$/,
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a user ID
 * @param userId - The user ID to validate
 * @returns ValidationResult indicating if the ID is valid
 */
export const validateUserId = (userId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof userId !== 'string') {
    errors.push('User ID must be a string');
  } else if (!userId) {
    errors.push('User ID is required');
  } else if (!REGEX.userId.test(userId)) {
    errors.push('User ID format is invalid (alphanumeric, hyphens, underscores only, 1-128 chars)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates an email address
 * @param email - The email to validate
 * @returns ValidationResult indicating if the email is valid
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof email !== 'string') {
    errors.push('Email must be a string');
  } else if (!email) {
    errors.push('Email is required');
  } else if (!REGEX.email.test(email)) {
    errors.push('Email format is invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a name field
 * @param name - The name to validate
 * @returns ValidationResult indicating if the name is valid
 */
export const validateName = (name: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof name !== 'string') {
    errors.push('Name must be a string');
  } else if (!name.trim()) {
    errors.push('Name is required');
  } else if (name.length > 100) {
    errors.push('Name is too long (max 100 characters)');
  } else if (!REGEX.name.test(name)) {
    errors.push('Name contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a phone number
 * @param phone - The phone number to validate
 * @returns ValidationResult indicating if the phone number is valid
 */
export const validatePhone = (phone: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof phone !== 'string') {
    errors.push('Phone number must be a string');
  } else if (phone && !REGEX.phone.test(phone)) {
    errors.push('Phone number format is invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a payment amount
 * @param amount - The amount to validate (in paise)
 * @returns ValidationResult indicating if the amount is valid
 */
export const validateAmount = (amount: number): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push('Amount must be a valid number');
  } else if (amount <= 0) {
    errors.push('Amount must be greater than 0');
  } else if (!Number.isInteger(amount)) {
    errors.push('Amount must be an integer (in paise)');
  } else if (amount > 10000000) { // 100,000 INR in paise
    errors.push('Amount is too large (max 100,000 INR)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a currency code
 * @param currency - The currency to validate
 * @returns ValidationResult indicating if the currency is valid
 */
export const validateCurrency = (currency: string): ValidationResult => {
  const errors: string[] = [];
  const validCurrencies = ['INR', 'USD', 'EUR', 'GBP']; // Add more as needed
  
  if (typeof currency !== 'string') {
    errors.push('Currency must be a string');
  } else if (!currency) {
    errors.push('Currency is required');
  } else if (!validCurrencies.includes(currency.toUpperCase())) {
    errors.push(`Currency must be one of: ${validCurrencies.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a plan type
 * @param plan - The plan to validate
 * @returns ValidationResult indicating if the plan is valid
 */
export const validatePlan = (plan: string): ValidationResult => {
  const errors: string[] = [];
  const validPlans = ['free', 'premium', 'enterprise'];
  
  if (typeof plan !== 'string') {
    errors.push('Plan must be a string');
  } else if (!plan) {
    errors.push('Plan is required');
  } else if (!validPlans.includes(plan)) {
    errors.push(`Plan must be one of: ${validPlans.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a case ID
 * @param caseId - The case ID to validate
 * @returns ValidationResult indicating if the case ID is valid
 */
export const validateCaseId = (caseId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof caseId !== 'string') {
    errors.push('Case ID must be a string');
  } else if (!caseId) {
    errors.push('Case ID is required');
  } else if (!REGEX.caseId.test(caseId)) {
    errors.push('Case ID format is invalid (alphanumeric, hyphens, underscores only, 1-100 chars)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a Razorpay order ID
 * @param orderId - The order ID to validate
 * @returns ValidationResult indicating if the order ID is valid
 */
export const validateRazorpayOrderId = (orderId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof orderId !== 'string') {
    errors.push('Order ID must be a string');
  } else if (!orderId) {
    errors.push('Order ID is required');
  } else if (!REGEX.razorpayId.test(orderId)) {
    errors.push('Order ID format is invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a Razorpay payment ID
 * @param paymentId - The payment ID to validate
 * @returns ValidationResult indicating if the payment ID is valid
 */
export const validateRazorpayPaymentId = (paymentId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof paymentId !== 'string') {
    errors.push('Payment ID must be a string');
  } else if (!paymentId) {
    errors.push('Payment ID is required');
  } else if (!REGEX.razorpayId.test(paymentId)) {
    errors.push('Payment ID format is invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a Razorpay signature
 * @param signature - The signature to validate
 * @returns ValidationResult indicating if the signature is valid
 */
export const validateRazorpaySignature = (signature: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof signature !== 'string') {
    errors.push('Signature must be a string');
  } else if (!signature) {
    errors.push('Signature is required');
  } else if (signature.length < 32) { // Basic length check for hash
    errors.push('Signature length is invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates specialty field
 * @param specialty - The specialty to validate
 * @returns ValidationResult indicating if the specialty is valid
 */
export const validateSpecialty = (specialty: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof specialty !== 'string') {
    errors.push('Specialty must be a string');
  } else if (!specialty.trim()) {
    errors.push('Specialty is required');
  } else if (specialty.length > 100) {
    errors.push('Specialty is too long (max 100 characters)');
  } else if (!REGEX.specialty.test(specialty)) {
    errors.push('Specialty contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a generic text field with sanitization
 * @param text - The text to validate
 * @param maxLength - Maximum length allowed (default: 10000)
 * @returns ValidationResult indicating if the text is valid
 */
export const validateTextField = (text: string, maxLength: number = 10000): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof text !== 'string') {
    errors.push('Text must be a string');
  } else if (text.length > maxLength) {
    errors.push(`Text is too long (max ${maxLength} characters)`);
  } else if (!REGEX.alphanumeric.test(text.substring(0, Math.min(text.length, 1000)))) {
    // Check first 1000 chars to avoid performance issues for very long inputs
    errors.push('Text contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates confidence level (0-100)
 * @param confidence - The confidence level to validate
 * @returns ValidationResult indicating if the confidence is valid
 */
export const validateConfidence = (confidence: number): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof confidence !== 'number' || isNaN(confidence)) {
    errors.push('Confidence must be a valid number');
  } else if (confidence < 0 || confidence > 100) {
    errors.push('Confidence must be between 0 and 100');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates an array of items using a specific validator
 * @param items - The array of items to validate
 * @param validator - The validator function to apply to each item
 * @param maxItems - Maximum number of items allowed (default: 100)
 * @returns ValidationResult indicating if the array is valid
 */
export const validateArray = <T>(
  items: T[],
  validator: (item: T) => ValidationResult,
  maxItems: number = 100
): ValidationResult => {
  const errors: string[] = [];
  
  if (!Array.isArray(items)) {
    errors.push('Expected an array');
  } else if (items.length > maxItems) {
    errors.push(`Too many items (max ${maxItems})`);
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = validator(item);
      if (!result.isValid) {
        errors.push(`Item at index ${i} is invalid: ${result.errors.join(', ')}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizes input by removing potentially dangerous characters
 * @param input - The input to sanitize
 * @returns Sanitized input string
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters while preserving allowed ones
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: urls
    .replace(/vbscript:/gi, '') // Remove vbscript: urls
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};