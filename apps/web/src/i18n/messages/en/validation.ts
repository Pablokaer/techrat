import type { ValidationMessageKey } from "@techrat/validation";

// Client-side form validation messages, keyed like VALIDATION_MESSAGES in @techrat/validation.
export const validation: Record<ValidationMessageKey, string> & { invalid: string } = {
  passwordMin: "At least 8 characters",
  passwordLower: "Include a lowercase letter",
  passwordUpper: "Include an uppercase letter",
  passwordDigit: "Include a number",
  username: "3-32 characters: letters, numbers or underscore",
  email: "Enter a valid email address",
  emailMax: "At most 256 characters",
  passwordRequired: "Enter your password",
  displayNameMin: "At least 2 characters",
  displayNameMax: "At most 40 characters",
  bioMax: "At most 280 characters",
  passwordsMismatch: "Passwords do not match",
  currentPasswordRequired: "Enter your current password",
  passwordSameAsCurrent: "Use a password different from your current one",
  url: "Enter a valid URL",
  httpsUrl: "Use an https URL",
  invalid: "Invalid value",
};
