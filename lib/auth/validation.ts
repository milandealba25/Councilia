export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordRuleId = "length" | "uppercase" | "number" | "special";

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  valid: boolean;
}

export function sanitizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function sanitizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function sanitizePassword(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidName(name: string): boolean {
  return name.length >= 2 && name.length <= 80;
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: "Mínimo 8 caracteres",
      valid: password.length >= 8,
    },
    {
      id: "uppercase",
      label: "Al menos 1 mayúscula",
      valid: /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "Al menos 1 número",
      valid: /\d/.test(password),
    },
    {
      id: "special",
      label: "Al menos 1 carácter especial",
      valid: /[\W_]/.test(password),
    },
  ];
}

export function normalizeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}
