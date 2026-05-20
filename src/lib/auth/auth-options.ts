import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validation/schemas';
import { getLoginLimiter, getClientIp } from './rate-limit';

/**
 * Session strategy: JWT.
 * Justification (per Phase 2): JWT is stateless, so middleware can verify the
 * dashboard cookie without a DB round-trip on every request. Trade-off is that
 * we can't instantly revoke a session server-side — acceptable for SecureGate's
 * scope. A 7-day maxAge keeps the blast radius of a stolen cookie bounded.
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        // Rate limit by IP — 5 attempts per 10 minutes (Phase 5).
        const headers = new Headers(req?.headers as Record<string, string>);
        const ip = getClientIp(headers);
        const { success } = await getLoginLimiter().limit(ip);
        if (!success) {
          throw new Error('Invalid credentials');
        }

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error('Invalid credentials');
        }

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });

        // Same generic error whether the user exists or the password is wrong.
        // We run a dummy bcrypt compare on the not-found path so response timing
        // doesn't reveal which case it was (timing-based enumeration).
        if (!user) {
          await bcrypt.compare(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
          throw new Error('Invalid credentials');
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
          throw new Error('Invalid credentials');
        }

        // Only verified users may sign in (Phase 3 requirement).
        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
      }
      return session;
    },
  },
};
