'use client';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: 0 | 1 | 2 | 3;
  label: 'Weak' | 'Fair' | 'Strong';
  color: string;
}

// Weak / fair / strong based on length and character variety (Phase 6, Page 7).
export function evaluatePassword(pw: string): StrengthResult {
  let points = 0;
  if (pw.length >= 8) points++;
  if (pw.length >= 12) points++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++;
  if (/[0-9]/.test(pw)) points++;
  if (/[^A-Za-z0-9]/.test(pw)) points++;

  if (points <= 2) return { score: 1, label: 'Weak', color: 'bg-destructive' };
  if (points <= 3) return { score: 2, label: 'Fair', color: 'bg-warning' };
  return { score: 3, label: 'Strong', color: 'bg-primary' };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;
  const { score, label, color } = evaluatePassword(password);
  const bars = 3;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded transition-colors ${
              i < score ? color : 'bg-border'
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{label}</span>
      </p>
    </div>
  );
}
