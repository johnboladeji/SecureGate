# SecureGate

Authentication and security app built for the Design to MVP Bootcamp live assessment.

**Stack:** Next.js 14 · TypeScript · Prisma · PostgreSQL · NextAuth · bcryptjs · Resend · Upstash · Vercel

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in real values in .env.local
npx prisma migrate dev --name init
npm run dev
```

## Environment variables

Set these in `.env.local` locally and in the Vercel dashboard for production:

- `DATABASE_URL` — PostgreSQL (Neon, Supabase, or similar)
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` in dev, your Vercel URL in prod
- `RESEND_API_KEY` — from resend.com
- `UPSTASH_REDIS_REST_URL` — from upstash.com
- `UPSTASH_REDIS_REST_TOKEN` — from upstash.com

## Engineering reflection

See `REFLECTION.md` for the engineering-laws walkthrough.
