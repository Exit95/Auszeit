/**
 * In-Memory Rate Limiter
 * Protects against brute-force attacks and DoS
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage (reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix?: string;    // Optional prefix for the key
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;   // Seconds until reset
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests, keyPrefix = '' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or expired, create new
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request (IP or forwarded IP)
 */
export function getClientIdentifier(request: Request): string {
  // Check for forwarded IP headers (behind reverse proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a hash of user-agent + accept headers
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const accept = request.headers.get('accept') || '';
  return `ua:${simpleHash(userAgent + accept)}`;
}

/**
 * Simple hash function for fallback identification
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Login attempts: 5 per minute
  LOGIN: { windowMs: 60000, maxRequests: 5, keyPrefix: 'login' },
  
  // Booking/form submissions: 10 per 5 minutes
  BOOKING: { windowMs: 300000, maxRequests: 10, keyPrefix: 'booking' },
  
  // Review submissions: 5 per hour
  REVIEW: { windowMs: 3600000, maxRequests: 5, keyPrefix: 'review' },
  
  // API calls: 100 per minute
  API: { windowMs: 60000, maxRequests: 100, keyPrefix: 'api' },
  
  // Admin actions: 30 per minute
  ADMIN: { windowMs: 60000, maxRequests: 30, keyPrefix: 'admin' },
};

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}

/**
 * Create 429 Too Many Requests response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...rateLimitHeaders(result),
      },
    }
  );
}

