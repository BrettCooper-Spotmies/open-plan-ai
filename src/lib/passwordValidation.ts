export type PasswordRequirement = { label: string; met: boolean };

export const PASSWORD_REQUIREMENTS_LABELS = {
  minLength: '8+ chars',
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',
  number: 'Number',
  special: 'Special char',
} as const;

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: PASSWORD_REQUIREMENTS_LABELS.minLength, met: password.length >= 8 },
    { label: PASSWORD_REQUIREMENTS_LABELS.uppercase, met: /[A-Z]/.test(password) },
    { label: PASSWORD_REQUIREMENTS_LABELS.lowercase, met: /[a-z]/.test(password) },
    { label: PASSWORD_REQUIREMENTS_LABELS.number, met: /[0-9]/.test(password) },
    { label: PASSWORD_REQUIREMENTS_LABELS.special, met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return getPasswordRequirements(password).every((r) => r.met);
}

export function getUnmetRequirementLabels(password: string): string[] {
  return getPasswordRequirements(password)
    .filter((r) => !r.met)
    .map((r) => r.label.toLowerCase());
}
