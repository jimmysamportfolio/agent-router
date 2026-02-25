export interface AppErrorOptions {
  cause?: unknown;
}

export abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: AppErrorOptions) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
  }
}

export class ConfigError extends AppError {
  readonly code = "CONFIG_MISSING";

  constructor(variable: string, options?: AppErrorOptions) {
    super(`${variable} is required`, options);
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_FAILED";
}

export class DatabaseError extends AppError {
  readonly code = "DB_UNEXPECTED";
}

export class InvariantError extends AppError {
  readonly code = "INVARIANT_VIOLATED";
}
