'use client';

import { useState, FormEvent } from 'react';

export function ResendVerificationForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message ?? 'If your account needs verification, a new link has been sent.');
      setEmail('');
    } catch {
      setMessage('If your account needs verification, a new link has been sent.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left" noValidate>
      <label htmlFor="resend-email" className="label">
        Enter your email to resend the verification link
      </label>
      <input
        id="resend-email"
        type="email"
        autoComplete="email"
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={submitting}
      />
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Sending…' : 'Resend verification email'}
      </button>
      {message && (
        <div role="status" className="rounded-md bg-primary/10 p-3 text-sm text-primary">
          {message}
        </div>
      )}
    </form>
  );
}
