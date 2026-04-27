export type PasswordStrength = 'weak' | 'fair' | 'strong';

export interface PasswordValidation {
  isValid: boolean;
  strength: PasswordStrength;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push('Must be at least 10 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain an uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain a number');
  }

  const isValid = errors.length === 0;

  let strength: PasswordStrength = 'weak';
  if (isValid) {
    strength = password.length >= 14 && /[!@#$%^&*(),.?":{}|<>]/.test(password)
      ? 'strong'
      : 'fair';
  }

  return { isValid, strength, errors };
}
