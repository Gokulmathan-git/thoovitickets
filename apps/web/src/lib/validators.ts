export const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[+]?[0-9]{7,15}$/,
  nameOnly: /^[a-zA-Z\s'.,-]+$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
};

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Email is required';
  if (!patterns.email.test(value)) return 'Enter a valid email address';
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value.trim()) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return 'Phone number must be at least 7 digits';
  if (digits.length > 15) return 'Phone number must not exceed 15 digits';
  return null;
}

export function validateName(value: string, label = 'Name'): string | null {
  if (!value.trim()) return `${label} is required`;
  if (value.trim().length < 2) return `${label} must be at least 2 characters`;
  if (value.trim().length > 50) return `${label} must not exceed 50 characters`;
  if (!patterns.nameOnly.test(value.trim())) return `${label} must contain only letters`;
  return null;
}

export function validateRequired(value: string, label = 'This field'): string | null {
  if (!value.trim()) return `${label} is required`;
  return null;
}

export function validateGST(value: string): string | null {
  if (!value.trim()) return null;
  if (!patterns.gst.test(value.toUpperCase())) return 'Enter a valid 15-character GST number';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-z]/.test(value)) return 'Must include a lowercase letter';
  if (!/[A-Z]/.test(value)) return 'Must include an uppercase letter';
  if (!/\d/.test(value)) return 'Must include a number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Must include a special character';
  return null;
}

export function sanitizePhone(value: string): string {
  if (value.startsWith('+')) return '+' + value.slice(1).replace(/\D/g, '');
  return value.replace(/\D/g, '');
}

export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z\s'.,-]/g, '');
}
