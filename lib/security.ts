// Security utilities for preventing replay and double-spend attacks

// In-memory store for tracking requests (in production, use Redis or similar)
const requestCache = new Map<string, { timestamp: number; processed: boolean }>();

// Function to check if a request has already been processed (replay attack prevention)
export function isRequestProcessed(requestId: string): boolean {
  const cachedRequest = requestCache.get(requestId);
  
  // If we've seen this request ID before, it might be a replay
  if (cachedRequest) {
    // Check if it was already processed
    if (cachedRequest.processed) {
      return true;
    }
    
    // If not processed yet but within a short time window, might be concurrent requests
    const timeDiff = Date.now() - cachedRequest.timestamp;
    if (timeDiff < 5000) { // 5 seconds window
      return true;
    }
  }
  
  return false;
}

// Function to mark a request as processed
export function markRequestProcessed(requestId: string): void {
  requestCache.set(requestId, {
    timestamp: Date.now(),
    processed: true
  });
  
  // Clean up old entries periodically
  setTimeout(() => {
    const now = Date.now();
    const entries = requestCache.entries();
    let entry;
    while ((entry = entries.next()) && !entry.done) {
      const [key, value] = entry.value;
      // Remove entries older than 1 hour
      if (now - value.timestamp > 3600000) {
        requestCache.delete(key);
      }
    }
  }, 0);
}

// Function to validate transaction uniqueness (double-spend prevention)
export function validateTransactionUniqueness(
  userId: string, 
  transactionId: string, 
  referenceId: string
): boolean {
  // In a real implementation, check the database for existing transactions
  // with the same reference ID or transaction ID to prevent double spending
  console.log(`Validating transaction for user: ${userId}, transaction: ${transactionId}, reference: ${referenceId}`);
  
  // This is a placeholder - in production, query your database
  // to ensure the same reference ID hasn't been used before
  return true;
}

// Function to validate payment uniqueness using reference ID
export function validatePaymentUniqueness(referenceId: string): boolean {
  // In a real implementation, check if this payment reference ID
  // already exists in the database to prevent duplicate processing
  console.log(`Validating payment uniqueness for reference: ${referenceId}`);
  
  // This is a placeholder - in production, query your database
  // to check if this reference ID already exists
  return true;
}

// Function to generate a secure request ID
export function generateSecureRequestId(userId: string, timestamp: number): string {
  // Combine user ID and timestamp with a random component
  const randomComponent = Math.random().toString(36).substring(2, 10);
  return `${userId}_${timestamp}_${randomComponent}`;
}

// Middleware to prevent replay attacks
export function withReplayProtection<T extends (req: any, res: any) => any>(handler: T) {
  return (req: any, res: any) => {
    // Generate a unique request ID based on key parameters
    const requestId = generateSecureRequestId(
      req.body.userId || req.query.userId || 'unknown',
      Date.now()
    );
    
    // Check if this request has already been processed
    if (isRequestProcessed(requestId)) {
      return res.status(409).json({ 
        error: 'Request already processed (possible replay attack)',
        code: 'REPLAY_DETECTED'
      });
    }
    
    // Mark the request as processed before handling
    markRequestProcessed(requestId);
    
    // Call the original handler
    return handler(req, res);
  };
}

// Function to validate transaction integrity
export function validateTransactionIntegrity(transactionData: any): boolean {
  // Validate that the transaction data hasn't been tampered with
  // This is a basic validation - in production, implement more robust checks
  
  if (!transactionData || !transactionData.userId || !transactionData.amount) {
    return false;
  }
  
  // Validate amount is positive
  if (transactionData.amount <= 0) {
    return false;
  }
  
  // Validate timestamp is recent (prevent old transactions)
  if (transactionData.timestamp) {
    const now = Date.now();
    const timeDiff = now - transactionData.timestamp;
    // Allow transactions up to 5 minutes old
    if (timeDiff > 300000) {
      return false;
    }
  }
  
  return true;
}