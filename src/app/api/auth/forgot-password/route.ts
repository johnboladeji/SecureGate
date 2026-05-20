import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { generateSecureToken, resetTokenExpiry } from '@/lib/auth/tokens';
import { sendResetEmail } from '@/lib/email/send';
import { getForgotPasswordLimiter, getClientIp } from '@/lib/auth/rate-limit';

// The single canonical response. Same for every code path.
// This is the principle in action: an attacker cannot tell from the response
// whether the email exists in our system.
const GENERIC_RESPONSE = {
  message: 'If an account exists for this email, a reset link has been sent.',
};

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const { success } = await getForgotPasswordLimiter().limit(ip);
    if (!success) {
      // Even the rate-limit response is generic — don't confirm a specific email was tried
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    // Invalid email format → still return generic success.
    // We absolutely must not say "that's not a valid email" here.
    if (!parsed.success) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Only actually send the email if the user exists. Same response either way.
    if (user) {
      // Invalidate any previous reset tokens for this email — one active reset at a time
      await prisma.passwordResetToken.deleteMany({ where: { email } });

      const token = generateSecureToken();
      await prisma.passwordResetToken.create({
        data: {
          email,
          token,
          expires: resetTokenExpiry(),
        },
      });

      try {
        await sendResetEmail({ to: email, token });
      } catch (err) {
        // Log, but don't tell the client.
        console.error('[forgot-password] email failed:', err);
      }
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (err) {
    console.error('[forgot-password] unexpected error:', err);
    // Even on internal error, return the generic response.
    // A 500 here would tip off an attacker that the email matched a real user
    // (because the success path is doing more work and is more likely to fail).
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }
}
