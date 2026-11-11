export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const errorFactory = {  unauthorized: (message = "Please sign in to continue.") =>
    new AppError(401, "AUTH_REQUIRED", message),
  forbidden: (message = "You do not have access to this action.") =>
    new AppError(403, "AUTH_FORBIDDEN", message),
  notFound: (message = "The requested resource was not found.") =>
    new AppError(404, "NOT_FOUND", message),
  conflict: (code: string, message: string) => new AppError(409, code, message),
  validation: (message: string, details?: unknown) =>
    new AppError(422, "VALIDATION_ERROR", message, details),
  insufficientFunds: () =>
    new AppError(402, "INSUFFICIENT_FUNDS", "Your wallet balance is too low for this transaction."),
  walletFrozen: () =>
    new AppError(403, "WALLET_FROZEN", "This wallet is frozen. Contact support to restore access."),
  providerUnavailable: () =>
    new AppError(
      503,
      "PROVIDER_UNAVAILABLE",
      "The service provider is temporarily unavailable. Your wallet was not charged.",
    ),
};

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
