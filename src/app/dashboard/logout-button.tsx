'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';

export function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setSubmitting(true);
    // callbackUrl ensures we land on /login.
    // redirect: true is the NextAuth default — it clears the cookie server-side AND navigates.
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={submitting}
      className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted/40 transition-colors disabled:opacity-50"
    >
      {submitting ? 'Logging out…' : 'Log out'}
    </button>
  );
}
