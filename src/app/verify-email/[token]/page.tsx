import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ResendVerificationForm } from './resend-form';

interface PageProps {
  params: { token: string };
}

type VerifyResult =
  | { status: 'success' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'already-verified' };

async function verifyToken(token: string): Promise<VerifyResult> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) {
    return { status: 'invalid' };
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return { status: 'expired' };
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return { status: 'invalid' };
  }

  if (user.emailVerified) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return { status: 'already-verified' };
  }

  // Mark user verified AND delete the used token atomically.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return { status: 'success' };
}

export default async function VerifyEmailPage({ params }: PageProps) {
  const result = await verifyToken(params.token);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card text-center">
        {result.status === 'success' && (
          <>
            <h1 className="text-2xl font-semibold">Email verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is now active. You can log in.
            </p>
            <Link href="/login" className="btn-primary mt-6 inline-block">Go to login</Link>
          </>
        )}
        {result.status === 'already-verified' && (
          <>
            <h1 className="text-2xl font-semibold">Already verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This account has already been verified.
            </p>
            <Link href="/login" className="btn-primary mt-6 inline-block">Go to login</Link>
          </>
        )}
        {result.status === 'expired' && (
          <>
            <h1 className="text-2xl font-semibold">Link expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verification links expire after 15 minutes. Request a new one below.
            </p>
            <ResendVerificationForm />
          </>
        )}
        {result.status === 'invalid' && (
          <>
            <h1 className="text-2xl font-semibold">Invalid link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This verification link is not valid. It may have already been used.
            </p>
            <ResendVerificationForm />
          </>
        )}
      </div>
    </main>
  );
}
