import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/validation/schemas';

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;
    const resetRecord = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 },
      );
    }

    if (resetRecord.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email: resetRecord.email } });
    if (!user) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update password and delete the used token in one transaction so a crash
    // between the two writes can't leave the token replayable.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.delete({ where: { token } }),
    ]);

    return NextResponse.json(
      { message: 'Password reset successfully. You can now log in.' },
      { status: 200 },
    );
  } catch (err) {
    console.error('[reset-password] unexpected error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
