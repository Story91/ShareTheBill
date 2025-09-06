// Error handling utilities for ShareTheBill

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class PaymentError extends AppError {
  public details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "PAYMENT_ERROR", 400);
    if (details) {
      this.details = details;
    }
  }
}

export class OCRError extends AppError {
  constructor(message: string) {
    super(message, "OCR_ERROR", 500);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network request failed") {
    super(message, "NETWORK_ERROR", 503);
  }
}

// Error handler for API responses
export function handleApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const errorObj = error as Record<string, unknown>;

  if (errorObj?.response) {
    // HTTP error response
    const response = errorObj.response as {
      status: number;
      data?: { error?: string };
      statusText?: string;
    };
    const status = response.status;
    const message =
      response.data?.error || response.statusText || "Request failed";

    switch (status) {
      case 400:
        return new ValidationError(message);
      case 401:
        return new UnauthorizedError(message);
      case 404:
        return new NotFoundError(message);
      default:
        return new AppError(message, "HTTP_ERROR", status);
    }
  }

  if (errorObj?.code === "NETWORK_ERROR" || !navigator.onLine) {
    return new NetworkError("Please check your internet connection");
  }

  // Generic error
  const message =
    (errorObj?.message as string) || "An unexpected error occurred";
  return new AppError(message);
}

// Retry utility with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw handleApiError(lastError);
      }

      // Don't retry on certain errors
      if (
        error instanceof ValidationError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw handleApiError(lastError!);
}

// Safe async operation wrapper
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const appError = handleApiError(error);
    console.error("Safe async operation failed:", appError);

    return {
      data: fallback,
      error: appError,
    };
  }
}

// Validation helpers
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined || value === "") {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (typeof value !== "number" || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
}

export function validateFid(fid: unknown): number {
  const fidNumber = typeof fid === "string" ? parseInt(fid, 10) : Number(fid);
  if (isNaN(fidNumber) || fidNumber <= 0) {
    throw new ValidationError("Invalid Farcaster ID");
  }
  return fidNumber;
}

export function validateAmount(
  amount: unknown,
  currency: string = "USDC",
): number {
  const amountNumber =
    typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(amountNumber) || amountNumber <= 0) {
    throw new ValidationError(`Invalid amount for ${currency}`);
  }
  if (amountNumber > 1000000) {
    throw new ValidationError(`Amount too large for ${currency}`);
  }
  return Math.round(amountNumber * 100) / 100; // Round to 2 decimal places
}

// Error logging utility
export function logError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  };

  console.error("Application Error:", errorInfo);

  // In production, you would send this to an error monitoring service
  // like Sentry, LogRocket, or Bugsnag
  if (process.env.NODE_ENV === "production") {
    // Example: Sentry.captureException(error, { extra: context });
  }
}

// User-friendly error messages
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.code) {
    case "VALIDATION_ERROR":
      return error.message;
    case "NOT_FOUND":
      return "The requested item could not be found.";
    case "UNAUTHORIZED":
      return "You are not authorized to perform this action.";
    case "PAYMENT_ERROR":
      return "Payment processing failed. Please check your wallet and try again.";
    case "OCR_ERROR":
      return "Failed to process receipt image. Please try again or enter the amount manually.";
    case "NETWORK_ERROR":
      return "Connection failed. Please check your internet connection and try again.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

// Error boundary helper
export function createErrorBoundaryProps(component: string) {
  return {
    onError: (error: Error, errorInfo: Record<string, unknown>) => {
      logError(error, { component, errorInfo });
    },
  };
}
