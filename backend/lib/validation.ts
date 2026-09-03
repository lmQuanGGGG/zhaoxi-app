export class ValidationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = "ValidationError";
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

export function requiredString(object: Record<string, unknown>, key: string, max: number) {
  const value = object[key];
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new ValidationError(`${key} must be a non-empty string up to ${max} characters.`);
  }
  return value.trim();
}

export function optionalString(object: Record<string, unknown>, key: string, max: number) {
  const value = object[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > max) {
    throw new ValidationError(`${key} must be a string up to ${max} characters.`);
  }
  return value.trim();
}

export function optionalRecord(object: Record<string, unknown>, key: string) {
  const value = object[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${key} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}
