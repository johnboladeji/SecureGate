import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { generateSecureToken, verificationTokenExpiry } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/email/send';

const GENERIC_RESPONSE = {
  message: 'If your account needs verification, a new link has been sent.',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.emailVerified) {
      // Invalidate previous tokens for this email
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });

      const token = generateSecureToken();
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires: verificationTokenExpiry(),
        },
      });

      try {
        await sendVerificationEmail({ to: email, name: user.name, token });
      } catch (err) {
        console.error('[resend-verification] email failed:', err);
      }
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (err) {
    console.error('[resend-verification] unexpected error:', err);
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }
}
