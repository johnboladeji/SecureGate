import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card text-center">
        <h1 className="text-3xl font-semibold">SecureGate</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A focused authentication system. Sign up, verify, and access your dashboard.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login" className="btn-primary">
            Log in
          </Link>
          <Link
            href="/signup"
            className="w-full rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted/40 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
