'use client';

import { useState } from 'react';
import { validatePassword, type PasswordStrength } from '@/lib/password-validation';
import { Eye, EyeOff } from 'lucide-react';

const strengthColors: Record<PasswordStrength, string> = {
  weak: 'bg-destructive',
  fair: 'bg-warning',
  strong: 'bg-success',
};

const strengthLabels: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Good',
  strong: 'Strong',
};

export function PasswordInput({
  value,
  onChange,
  showStrength = false,
  autoComplete = 'new-password',
  autoFocus = false,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  showStrength?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const validation = showStrength ? validatePassword(value) : null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-input bg-background px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength && value.length > 0 && validation && (
        <div className="space-y-1.5">
          {/* Strength bar */}
          <div className="flex gap-1">
            {(['weak', 'fair', 'strong'] as const).map((level, i) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i === 0
                    ? strengthColors[validation.strength]
                    : i === 1 && (validation.strength === 'fair' || validation.strength === 'strong')
                      ? strengthColors[validation.strength]
                      : i === 2 && validation.strength === 'strong'
                        ? strengthColors[validation.strength]
                        : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {strengthLabels[validation.strength]}
          </p>

          {/* Validation errors */}
          {validation.errors.length > 0 && (
            <ul className="space-y-0.5">
              {validation.errors.map((err) => (
                <li key={err} className="text-xs text-destructive">
                  {err}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
