import crypto from 'crypto';

/**
 * Why crypto.randomBytes and not Math.random?
 * Math.random is NOT cryptographically secure — its output is predictable to anyone
 * who knows the seed. crypto.randomBytes pulls from the OS entropy pool.
 *
 * 32 bytes = 256 bits = 64 hex characters. That's 2^256 possible tokens, which is
 * the same key space as a SHA-256 hash. Brute-forcing a single valid token is
 * computationally infeasible (heat-death-of-universe territory).
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** 15 minutes from now — used for email verification tokens. */
export function verificationTokenExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000);
}

/** 1 hour from now — used for password reset tokens (per spec). */
export function resetTokenExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}
