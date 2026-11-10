export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, 409, details);
  }
}

export function toErrorPayload(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }
  console.error("[seru] unexpected error", error);
  return {
    status: 500,
    body: {
      error: "INTERNAL_ERROR",
      message: "Terjadi kesalahan pada server. Silakan coba lagi.",
    },
  };
}
