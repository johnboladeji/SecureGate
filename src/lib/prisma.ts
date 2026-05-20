import { PrismaClient } from '@prisma/client';

// In Next.js dev mode, hot-reload re-runs this file and would create a new
// PrismaClient on every change, eventually exhausting the DB connection pool.
// Caching on `globalThis` keeps a single client across reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
