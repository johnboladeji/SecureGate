import { transporter, EMAIL_FROM } from './transport';
import { VerificationEmail } from '@/emails/verification-email';
import { ResetEmail } from '@/emails/reset-email';

function appUrl(): string {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const verifyUrl = `${appUrl()}/verify-email/${params.token}`;
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: params.to,
      subject: 'Verify your SecureGate email',
      html: VerificationEmail(params.name, verifyUrl),
    });
  } catch (error) {
    console.error('[sendVerificationEmail] Nodemailer error:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendResetEmail(params: {
  to: string;
  token: string;
}): Promise<void> {
  const resetUrl = `${appUrl()}/reset-password/${params.token}`;
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: params.to,
      subject: 'Reset your SecureGate password',
      html: ResetEmail(resetUrl),
    });
  } catch (error) {
    console.error('[sendResetEmail] Nodemailer error:', error);
    throw new Error('Failed to send reset email');
  }
}
