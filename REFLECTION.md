# SecureGate — Reflection & Engineering Analysis

**Name:** John Oladeji
**Cohort:** Design to MVP Bootcamp
**Live URL:** https://secure-gate-jhnb.vercel.app
**GitHub Repo:** https://github.com/johnboladeji/SecureGate

---

## Part 1 — What I Built

SecureGate is a standalone Next.js 14 authentication app with signup, email verification, login, a protected dashboard, forgot/reset password, rate limiting, and logout. Passwords are hashed with bcrypt at cost factor 12, tokens are generated with crypto.randomBytes, sessions are JWTs verified by middleware, and all secrets live in environment variables. The brief specified Resend for email, but its free tier could not deliver to the grader's inbox without a paid custom domain, so I swapped it for Nodemailer with Gmail SMTP behind a clean email abstraction.

## Part 2 — What Surprised Me

The biggest surprise was the Resend to Nodemailer pivot and the build failure that followed. I started with Resend, only to discover that the free tier would not deliver to the grader's email without a paid domain. I switched to Nodemailer with Gmail SMTP, which worked locally, but then Vercel failed the build because of a peer-dependency conflict I had not seen on my machine.

That taught me that local success does not guarantee production success. A stricter environment will surface dependency leaks you never noticed. It also reminded me that email delivery is full of hidden constraints, and you often do not discover them until you try to send a real message.

---

## Part 3 — Engineering Laws Quiz

### Q1 — Murphy's Law

**Code reference:** `src/lib/auth/auth-options.ts` line 35 (login rate limiter); `src/app/api/auth/reset-password/route.ts` (password update + token delete transaction)

**My Answer:** I added a couple of protections because I always assume the worst-case user and the worst-case failure. The first one was login rate limiting in auth-options.ts. Without it, a bot could hammer the login endpoint with unlimited password guesses. The second was wrapping the reset-password flow in a database transaction. Updating the password and deleting the reset token happen together, so if the server crashed halfway through, I would not accidentally leave a valid token sitting around for reuse.

Those were the two places where I stopped and asked myself what could go wrong. The answers were pretty clear: brute-force account takeover and replayable reset tokens. I built the defenses before those problems could show up.

**What goes wrong if ignored:** Without rate limiting, an attacker can run unlimited credential-stuffing or brute-force attempts. Without the transaction, a crash mid-reset could leave a used token still valid for a second attacker.

---

### Q2 — Law of Leaky Abstractions

**Code reference:** `.npmrc` in the project root, and `package.json` using next-auth@4.24.14 with nodemailer@6.10.1

**My Answer:** NextAuth seemed like a simple, clean abstraction. I installed it, set up the Credentials provider, and everything worked locally. What I did not expect was that its dependency tree would cause a deployment failure even though nothing looked wrong on my machine.

When Vercel ran npm install, the build failed with an ERESOLVE error. NextAuth v4 lists nodemailer@^7.0.7 as a peerOptional dependency because it needs that version for its built-in Email provider. I never used that provider. I wrote my own email layer with nodemailer v6 in src/lib/email/transport.ts. Even so, the library still insisted on a specific version of nodemailer for a feature I was not using, and that alone was enough to break the production build.

The abstraction leaked in two ways. First, NextAuth's internal expectations for its Email provider and the nodemailer version it wants became my problem even though I only use the Credentials provider. Second, the issue was completely hidden on my laptop. My local npm install had already resolved the conflict because I had used legacy-peer-deps earlier, so everything looked fine until Vercel ran a stricter install and refused to continue.

To fix it, I had to drop below the level of the auth library and deal with npm directly. I added an .npmrc file with legacy-peer-deps=true so npm would install despite the peer dependency conflict. I am comfortable with this because the conflict is optional and tied to a feature I do not use. Nodemailer v6 works perfectly for my own email code.

**What goes wrong if ignored:** If I had treated NextAuth as a sealed black box and assumed it would always work, I would have been stuck staring at an ERESOLVE error with no clue why an auth library cared about a mail package. The only way through was understanding how npm resolves peer dependencies and why optional peer dependencies can still surface during a strict install. The lesson for me is that no abstraction is completely sealed. As soon as I deployed to an environment stricter than my laptop, the internals showed up and I had to understand what was underneath to fix the problem.

---

### Q3 — YAGNI (You Aren't Gonna Need It)

**Code reference:** The absence of the features — no Account/OAuth table and no audit-log model in `prisma/schema.prisma`

**My Answer:** I deliberately left out social login, MFA, and audit logs because none of them helped me deliver the actual task in front of me. Each one is real engineering work with a lot of edge cases. Social login means setting up OAuth apps and handling account linking. MFA means adding a TOTP library, recovery codes, and a whole extra flow. Audit logs need a write path, a retention plan, and a model in the schema.

None of that mattered for the brief I was working on. If I had chased those features, I would have burned my limited time on things that look impressive but do nothing for the core functionality. When the time comes to add them properly, I would introduce them as first-class features: a real Account table for OAuth identities, a dedicated MFA setup and recovery flow, and a structured audit log model with retention rules. But for this build, they were unnecessary, so I left them out.

**What goes wrong if ignored:** Building features the task does not need wastes the limited time I had and risks shipping a half-broken core in exchange for things that only look impressive.

---

### Q4 — Kerckhoffs's Principle (salts, bcrypt, and SHA-256)

**Code reference:** `src/app/api/auth/signup/route.ts` line 8 (`BCRYPT_ROUNDS = 12`), line 35 (`bcrypt.hash`); `src/lib/auth/auth-options.ts` line 56 (`bcrypt.compare`)

**My Answer:** When I hash passwords, I rely on bcrypt because it handles two critical things automatically: salting and slowness. A salt is just random data mixed into each password before hashing. It ensures that two people using the same password never end up with the same stored hash. bcrypt generates a fresh salt every time and embeds it directly into the hash string, so I never manage salts manually. The `$2b$12$...` prefix contains both the cost factor and the salt.

I chose a cost factor of 12 because it strikes a balance between security and usability. At 12 rounds, hashing takes roughly a fraction of a second. A real user never notices that delay, but an attacker trying billions of guesses absolutely does. That deliberate slowness is the whole point.

If I had used SHA-256 instead, it would have been a disaster. SHA-256 is designed to be fast. A GPU can compute billions of SHA-256 hashes per second, which makes brute-forcing trivial. And without per-password salting, rainbow tables crack common passwords instantly. bcrypt's slowness and automatic salting are exactly what stop both attacks.

**What goes wrong if ignored:** If I stored SHA-256 hashes, one database leak would turn into a mass credential-stuffing event across every site where users reused their password. That is why I stuck with bcrypt and why I picked 12 as the cost factor: slow enough to hurt attackers, fast enough to keep the app responsive.

---

### Q5 — Postel's Law + Security by Design (forgot-password response)

**Code reference:** `src/app/api/auth/forgot-password/route.ts` lines 11-13 (`GENERIC_RESPONSE`), lines 29-31 (silent skip on invalid email), lines 37-58 (sends only if the user exists, identical response either way)

**My Answer:** My forgot-password endpoint always returns the same message: "If an account exists, we've sent a link." It does that whether the email is real, fake, or malformed. I chose that behavior because the alternative leaks information.

If I returned "no account found" for unknown emails and "email sent" for real ones, an attacker could submit a list of emails and record which responses were which. That would give them my entire user list. From there, they could run targeted phishing, credential-stuffing, or just sell the email-service pairings. Even revealing who has an account is a privacy violation.

The trade-off is small. A legitimate user gets a slightly vaguer message, but that tiny UX cost buys real protection against enumeration. The vague message is worth it because it keeps attackers from learning anything useful.

**What goes wrong if ignored:** Email harvesting at scale, targeted phishing using leaked email-and-service pairings, and a privacy violation in simply revealing who holds an account.

---

### Q6 — The Boy Scout Rule

**Code reference:** `src/lib/auth/auth-options.ts` lines 49-52 (dummy `bcrypt.compare` on the user-not-found path)

**My Answer:** One cleanup I made was the dummy bcrypt.compare call on the user-not-found path in auth-options.ts. Even when the email does not exist, I still run a throwaway bcrypt comparison so the response time matches a real wrong-password attempt. Without that, an attacker could measure the timing difference and figure out which emails are registered.

It was not strictly required for the feature to work, but it made the system safer and more consistent. I try to leave the code a little better than I found it, and this was one of those small fixes that closes a subtle hole.

**What goes wrong if ignored:** A measurable timing difference between "no such user" and "wrong password" lets an attacker enumerate which emails are registered, just by timing the responses.

---

### Q7 — Gall's Law

**Code reference:** Build order across the project — `prisma/schema.prisma`, then `src/lib/auth/`, then `src/lib/email/`, then deployment

**My Answer:** I built this in phases because that was the only way to keep the complexity under control. I started with the database schema and made sure the models were solid. After that, I added authentication and got it working end-to-end. Once that was stable, I swapped in my own Nodemailer setup and tested the email flows. Only after all of that did I deploy.

Each phase was a working system before I moved on to the next. If I had tried to build everything at once, every failing test would have had five or six possible causes. By phasing the work, I always knew where the problem lived. That saved me from the kind of debugging chaos that happens when too many new components land at the same time.

**What goes wrong if ignored:** Building all phases at once creates a combinatorial debugging problem where a single failing test could have many interacting causes and no clean way to isolate them.

---

### Q8 — Law of Leaky Abstractions (applied to ORMs)

**Code reference:** `prisma/schema.prisma` line 14 (`id String @id @default(cuid())`)

**My Answer:** One place where Prisma diverges from the real database is the id field on my models. In schema.prisma, I used cuid() as the default. That value is generated by Prisma in the application layer, not by Postgres. If I ran a raw SQL insert without providing an id, Postgres would not generate one for me and the insert would fail. It is a small detail, but it shows how the ORM can hide behavior that does not exist in the underlying database.

That is the kind of leak I keep in mind. Prisma makes things convenient, but I still need to understand what the database actually does underneath.

**What goes wrong if ignored:** Anyone querying or inserting outside Prisma (raw SQL, a migration, a BI tool) hits surprising failures, because behavior the ORM supplies in the app layer simply does not exist in Postgres.

---

### Q9 — Zawinski's Law

**Code reference:** `src/lib/auth/rate-limit.ts` (the whole file — two limiters, separate key prefixes `rl:login` and `rl:forgot`)

**My Answer:** I kept rate limiting in its own module because it is a separate concern from identity, routing, or business logic. It does not belong inside NextAuth, inside a Next.js route, or mixed into the page layer. It is its own tool with its own rules, so I put it in its own file with two separate limiters for login and forgot-password, each with its own key prefix.

I did this because I have seen what happens when a library keeps absorbing features it was never meant to own. Pretty soon you have authentication mixed with rate limiting, logging, MFA, analytics, and everything else. That is how monoliths form. Keeping rate limiting separate was my way of staying disciplined and keeping each piece single-purpose.

**What goes wrong if ignored:** Auth libraries that try to absorb every adjacent feature become bloated, unauditable, and hard to replace.

---

### Q10 — The Principle of Least Surprise

**Code reference:** `src/app/(auth)/login/page.tsx` lines 35-41 (error branching); `src/lib/auth/auth-options.ts` (the generic `Invalid credentials` throws and the `EMAIL_NOT_VERIFIED` exception at line 63)

**My Answer:** The exact message I show is "Invalid credentials." I chose that wording because it hides whether the email or the password was wrong. Using the plural "credentials" instead of "password" is intentional. It keeps the attacker from learning anything useful.

The only exception is EMAIL_NOT_VERIFIED. I surface that one because the user has already proven they know the password, so I am not leaking anything sensitive by telling them their email is not verified.

**What goes wrong if ignored:** A more specific message ("wrong password" vs "no such user") hands an attacker an enumeration tool and makes password-spraying easier to target.

---

### Q11 — Murphy's Law + Defensive Programming (dashboard protection)

**Code reference:** `src/middleware.ts` lines 31-41 (`withAuth` + `authorized` callback), lines 22-27 (unverified redirect); `src/app/dashboard/page.tsx` lines 10-17 (`getServerSession` gate)

**My Answer:** A request to `/dashboard` hits my middleware before anything else. The matcher scopes it to dashboard routes, so the middleware runs on every visit. withAuth reads the `next-auth.session-token` cookie and verifies its signature using `NEXTAUTH_SECRET`. The authorized callback simply returns `Boolean(token)`. If the cookie is missing, expired, malformed, or signed with the wrong secret, authorized returns false and the user is redirected to `/login`.

There is an extra check too. If the token is valid but `emailVerified` is null, I redirect to `/login` with an error. That prevents unverified users from reaching the dashboard.

The deleted-cookie scenario is straightforward. If the user manually deletes their session cookie, the middleware sees no token, authorized returns false, and the user is immediately redirected to `/login`. The dashboard page never renders and no HTML is sent.

Even if someone somehow bypassed the middleware, the dashboard page itself calls `getServerSession` server-side. If there is no session, it redirects again. That gives me two independent gates, which is exactly the kind of defense in depth I want.

**What goes wrong if ignored:** A single gate that fails or is misconfigured would expose the dashboard to anyone; the second server-side check is what keeps a middleware mistake from leaking private data.

---

### Q12 — Kerckhoffs's Principle + Technical Debt (leaked NEXTAUTH_SECRET)

**Code reference:** `.gitignore` (excludes `.env.local`); `.env.example` (placeholder only, no real value)

**My Answer:** If NEXTAUTH_SECRET ever leaked, I would treat it as fully compromised and walk through recovery step by step.

First, I would assume an attacker could forge valid JWT session cookies for any user. That is the worst-case scenario. Next, I would generate a brand-new secret with something like openssl rand -base64 32 and update it in Vercel's environment variables. After redeploying, every existing session cookie would instantly become invalid because they were signed with the old secret. That logs everyone out, including any attacker.

Then I would rotate any other secrets that were exposed in the same leak. Since the commit would still exist in git history, I would either rewrite the history or treat the secret as permanently burned. Finally, I would check Vercel logs for any suspicious JWT-authenticated requests during the window where the secret was exposed.

That is the full recovery path in my own words.

**What goes wrong if ignored:** As long as the old secret stays valid, an attacker can silently forge sessions for any account without ever needing a password — undetectable account takeover.

---

### Q13 — Conway's Law

**Code reference:** Top-level structure — `src/app/(auth)/`, `src/app/api/auth/`, `src/lib/auth/`, `src/lib/email/`

**My Answer:** My folder structure reflects how I think about systems. I separate user-facing pages in (auth)/, API endpoints in api/auth/, and shared logic in lib/auth/. Email delivery lives in lib/email/. That split mirrors the way I mentally organize work: presentation, transport, logic, and persistence as distinct layers.

Some teams organize by feature. I tend to organize by role. It keeps the boundaries clear and makes it obvious where each piece of logic belongs.

**What goes wrong if ignored:** A flat, unstructured codebase becomes navigation hell as it grows, and nobody wants to restructure a working app later, so the mess becomes permanent.

---

### Q14 — Technical Debt

**Code reference:** `src/app/api/auth/signup/route.ts` line 8 and `src/app/api/auth/reset-password/route.ts` line 6 (`const BCRYPT_ROUNDS = 12` duplicated)

**My Answer:** The technical debt here is the duplicated bcrypt cost factor. I hardcoded BCRYPT_ROUNDS = 12 in two different files: signup/route.ts and reset-password/route.ts. It works today, but if I bump the cost factor in a few years, I could easily update one file and forget the other. That would create two different hashing strengths in the system, which is the kind of subtle bug that is hard to detect.

I left it that way because I was working under a three-hour time limit. The fix is simple: extract a shared constant and import it in both routes.

**The refactored version:**

```typescript
// src/lib/auth/config.ts
export const AUTH_CONFIG = {
  bcryptRounds: 12,
} as const;
```

```typescript
// signup/route.ts and reset-password/route.ts
import { AUTH_CONFIG } from '@/lib/auth/config';

const passwordHash = await bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
```

**What goes wrong if ignored:** The two files drift over time, leaving users hashed at different strengths with no easy way to tell which is which after the fact.

---

### Q15 — Synthesis (adding Flutterwave payments)

**Code reference:** Synthesis — applies across the whole codebase

**My Answer:** The moment money enters the system, several laws become far more important. The biggest one is idempotency. In authentication, a replayed request might just say "user already exists." In payments, a replayed request can charge a customer twice. That is the one rule I would enforce first.

Murphy's Law also becomes more serious. I have to assume the network will fail in the middle of a charge, so every payment request needs an idempotency key to guarantee that retries never double-charge.

YAGNI flips completely. Audit logs stop being optional. They become mandatory because I need a trace of every payment event.

Transactions matter more too. Upgrading a user and recording the payment must happen in one atomic step so I never end up with a paid user who was not charged or a charged user who was not upgraded.

Defense in depth also tightens. Premium routes should require a valid JWT, a verified email, and an active subscription. Rate limiting becomes stricter because card-testing fraud is real. Error messages must stay generic. "Card declined" is fine. Anything more detailed becomes a data leak.

**What goes wrong if ignored:** Payments raise the stakes — double-charges, chargebacks, fraud, and reconciliation problems. The rules that were nice to have in auth become non-negotiable when real money is on the line.

---

## Part 4 — One Thing I Would Refactor

I would extract a single shared configuration module for my security parameters. Right now my bcrypt cost factor (BCRYPT_ROUNDS = 12) is hardcoded separately in signup/route.ts and reset-password/route.ts, and token expiry values live in their own helper. Centralizing them in one src/lib/auth/config.ts file means I change a value once and every route stays consistent.

```typescript
// src/lib/auth/config.ts
export const AUTH_CONFIG = {
  bcryptRounds: 12,
  verificationTokenTtlMinutes: 15,
  resetTokenTtlMinutes: 60,
} as const;
```

Then signup and reset-password both import AUTH_CONFIG.bcryptRounds instead of each carrying their own copy. It removes the risk of the two files drifting apart, and it puts every security-sensitive number in one place where it is easy to review.

## Part 5 — How This Changes How I Build

I walked away from this build with a few lessons I did not fully appreciate before today.

First, security is often about what you do not reveal. A generic error message can be more protective than any fancy feature.

Second, a library's dependencies are not sealed. They leak the moment you deploy to an environment that enforces stricter rules than your laptop.

Third, defense in depth is cheap once you already have two gates. Adding a third or fourth is often just a few lines of code, and the payoff is huge.

Those are real takeaways for me, and they will shape how I build going forward.
