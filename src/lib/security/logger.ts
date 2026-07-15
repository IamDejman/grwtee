const SENSITIVE_PATTERNS = [
  /password/i,
  /otp/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /bearer\s+/i,
  /api[_-]?key/i
];

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_PATTERNS.some((p) => p.test(key))) {
    return "[REDACTED]";
  }
  if (typeof value === "object" && value !== null) {
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

export function safeLog(message: string, data?: Record<string, unknown>): void {
  if (data) {
    console.log(message, redactObject(data));
  } else {
    console.log(message);
  }
}

export function safeError(message: string, error?: unknown, data?: Record<string, unknown>): void {
  const payload: Record<string, unknown> = { ...(data ? redactObject(data) : {}) };
  if (error instanceof Error) {
    payload.errorMessage = error.message;
    payload.errorName = error.name;
  }
  console.error(message, Object.keys(payload).length ? payload : "");
}
