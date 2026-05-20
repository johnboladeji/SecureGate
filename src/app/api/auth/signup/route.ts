import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signupSchema } from '@/lib/validation/schemas';
import { generateSecureToken, verificationTokenExpiry } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/email/send';

const BCRYPT_ROUNDS = 12;

// Same generic response across success / already-exists paths so the endpoint
// does not reveal whether an email is registered (Phase 5 error-message rule).
const GENERIC_RESPONSE = {
  message: 'If the email is valid, a verification link has been sent.',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash },
    });

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
      console.error('[signup] verification email failed:', err);
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 201 });
  } catch (err) {
    console.error('[signup] unexpected error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
