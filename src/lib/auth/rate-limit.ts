import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

let loginLimiter: Ratelimit | null = null;
let forgotPasswordLimiter: Ratelimit | null = null;

// Login: 5 attempts per IP per 10 minutes (per Phase 5).
export function getLoginLimiter(): Ratelimit {
  if (!loginLimiter) {
    loginLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      prefix: 'rl:login',
    });
  }
  return loginLimiter;
}

// Forgot-password: rate-limited per Phase 5. We pick 5 / 10 min to match login.
export function getForgotPasswordLimiter(): Ratelimit {
  if (!forgotPasswordLimiter) {
    forgotPasswordLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      prefix: 'rl:forgot',
    });
  }
  return forgotPasswordLimiter;
}

// Vercel sets x-forwarded-for; we read the first IP in the chain.
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}
