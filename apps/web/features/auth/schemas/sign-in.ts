export type AuthMode = "sign-in" | "sign-up";

export type SignInInput = {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignInInput(input: SignInInput): string | null {
  if (input.mode === "sign-up" && input.name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }

  if (!EMAIL_PATTERN.test(input.email.trim())) {
    return "Enter a valid email address";
  }

  if (input.password.length < 8) {
    return "Password must be at least 8 characters";
  }

  return null;
}
