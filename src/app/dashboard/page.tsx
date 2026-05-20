import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { LogoutButton } from './logout-button';

export default async function DashboardPage() {
  // Defense in depth. Middleware already filtered unauthenticated users,
  // but we double-check here so a misconfigured middleware can't accidentally
  // expose this page. Server-side gate, runs before any HTML is sent.
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }
  if (!session.user.emailVerified) {
    redirect('/login?error=Please+verify+your+email+before+signing+in.');
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card">
        <Link href="/" className="mb-6 flex items-center gap-2 text-xl font-bold">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          SecureGate
        </Link>
        <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You are logged in as <span className="font-mono">{session.user.email}</span>.
        </p>

        <div className="mt-6 rounded-md border border-border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            This is your protected dashboard. Only verified, authenticated users can see this page.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Email verified: <span className="text-primary">✓</span>{' '}
            {new Date(session.user.emailVerified!).toLocaleString()}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
