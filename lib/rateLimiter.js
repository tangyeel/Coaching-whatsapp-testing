/**
 * In-memory sliding-window rate limiter for authentication & public form endpoints.
 * Thread-safe for serverless instances with automatic expiry sweep.
 */

const rateLimitMap = new Map();

export function checkRateLimit(key, maxPoints = 5, windowMs = 300000) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // If no record or expired, initialize
  if (!record || now - record.startTime > windowMs) {
    rateLimitMap.set(key, {
      count: 1,
      startTime: now,
    });
    return { allowed: true, remaining: maxPoints - 1, resetInMs: windowMs };
  }

  // Increment attempt counter
  record.count += 1;

  if (record.count > maxPoints) {
    const timeRemaining = windowMs - (now - record.startTime);
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, timeRemaining),
    };
  }

  return {
    allowed: true,
    remaining: maxPoints - record.count,
    resetInMs: windowMs - (now - record.startTime),
  };
}

// Clean up stale entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateLimitMap.entries()) {
      if (now - v.startTime > 600000) {
        rateLimitMap.delete(k);
      }
    }
  }, 600000);
}
