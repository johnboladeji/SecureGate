# AGENTS.md — SecureGate Build Rules

This file is your persistent context. Read it before every task. These rules never change and override any instinct to "improve" or "modernize."

## What this project is

SecureGate is a standalone Next.js 14 authentication app built for a graded bootcamp assessment. The full specification is in `DevDesign_LiveTask_SecureGate_1_.pdf` at the project root. **That PDF is the single source of truth.** When in doubt, re-read it. Do not add anything it does not ask for.

The code already exists (an audited starter). Your job is to modify and verify it, not rewrite it from scratch.

## Tech stack (fixed — do not substitute)

- Next.js 14 (App Router) + TypeScript
- PostgreSQL via Prisma ORM (hosted on Neon)
- NextAuth.js v4 — Credentials provider, JWT session strategy
- bcryptjs — password hashing, cost factor 12
- **Nodemailer + Gmail SMTP** for transactional email (the brief says Resend, but Resend's free tier cannot deliver to arbitrary recipients without a paid custom domain, which would fail the grader's cold test — Nodemailer + Gmail SMTP is the working substitute and this trade-off is documented in REFLECTION.md)
- Zod — server-side input validation
- Upstash Redis — rate limiting (shared instance with another project; keys are prefixed `rl:login` and `rl:forgot` to stay isolated)
- Vercel — hosting

## Environment variables (exactly these 10 — no more, no fewer)

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

`RESEND_API_KEY` must NOT appear anywhere — not in code, not in `.env.example`, not in `.env.local`. If you find it, remove it.

## Database schema (exact — do not add fields)

- **User**: `id, name, email, password, emailVerified, createdAt` — nothing else (no `updatedAt`)
- **VerificationToken**: `identifier, token, expires` — nothing else
- **PasswordResetToken**: `email, token, expires` — nothing else

Only three models. No extra indexes beyond `@unique` and `@id`. No join tables. No `Account` or `Session` tables (those are for NextAuth's database-session strategy, which we are not using).

## Hard security rules (non-negotiable)

- bcrypt cost factor is exactly **12**. Never use argon2, scrypt, SHA-256, or any other algorithm.
- Tokens are generated with `crypto.randomBytes(32).toString('hex')`. Never `Math.random`.
- Verification token expiry: **15 minutes**. Password reset token expiry: **1 hour**.
- Rate limit: **5 attempts per IP per 10 minutes** on login (inside NextAuth `authorize`) and forgot-password.
- Login errors are always the generic string **"Invalid credentials."** — never "wrong password" or "user not found."
- Forgot-password and signup must return the **same response whether or not the email exists** (no user enumeration).
- Never log password values anywhere (console, errors, anywhere).
- Never return stack traces or internal errors to the client — log server-side, return a generic message.
- Session tokens live in NextAuth's httpOnly cookie only — never localStorage/sessionStorage.
- `/dashboard` is protected by BOTH middleware AND a server-side `getServerSession` check (defense in depth).
- HTTP security headers in `next.config.js`: exactly three — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. No others.

## Scope guardrails (avoid feature creep)

- Build ONLY what the PDF Phases 1–6 require. No social login, no MFA, no audit logs, no profile editing, no email-change flow, no account deletion, no "remember me," no admin panel.
- Password strength indicator has exactly three levels: **Weak / Fair / Strong**.
- If you think of a "nice improvement," do not add it. Note it as deferred and move on.
- Do not add npm packages beyond what a task explicitly requires.

## Code style

- TypeScript strict mode. Explicit return types on exported functions. Avoid `any` except where NextAuth's types force it.
- Named exports. Descriptive names (`passwordHash`, not `hashedPw`).
- Comments explain WHY (tie to a brief requirement or an attack vector), not WHAT. One sentence max.
- No `console.log` left in production code paths (errors may use `console.error`).

## Workflow rules

- Work one task at a time. Do not jump ahead to later phases.
- Before editing a file, read it. After editing, state exactly what changed.
- If a shell command fails, STOP and report the exact error. Do not retry blindly or "fix" unrelated code.
- Never run a database reset (`prisma migrate reset`) without explicit permission — it destroys data.
- Never commit `.env.local`. Verify `.gitignore` excludes it before any git operation.
- Never paste secret values into responses. Refer to variables by name only.

## The REFLECTION.md file

`REFLECTION.md` is 40% of the grade and must be written in the seller's own voice. Do NOT rewrite, polish, or "improve" its prose. You may correct factual code references (file paths, line numbers) so they match the actual code, but the analysis stays the seller's words.
