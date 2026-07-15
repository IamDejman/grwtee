import { NextResponse } from "next/server";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const GENERIC_UNAUTHORIZED = "Unauthorized";
const GENERIC_INVALID_CREDENTIALS = "Invalid email or password";
const GENERIC_RESET_FAILURE =
  "If the details provided are correct, further instructions will be sent.";
const GENERIC_RESET_SUCCESS = "If the details provided are correct, your password has been updated.";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Strip internal details from errors before returning to clients. */
export function sanitizeClientError(error: unknown, fallback = GENERIC_ERROR): string {
  if (!isProduction()) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
  }
  return fallback;
}

export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

export function jsonUnauthorized() {
  return jsonError(GENERIC_UNAUTHORIZED, 401);
}

export function jsonInvalidCredentials() {
  return jsonError(GENERIC_INVALID_CREDENTIALS, 401);
}

export function jsonGenericServerError(context?: string) {
  if (context) {
    console.error(`[API] ${context}`);
  }
  return jsonError(GENERIC_ERROR, 500);
}

export {
  GENERIC_ERROR,
  GENERIC_UNAUTHORIZED,
  GENERIC_INVALID_CREDENTIALS,
  GENERIC_RESET_FAILURE,
  GENERIC_RESET_SUCCESS
};
