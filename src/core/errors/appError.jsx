export class AppError extends Error {
  code;
  constructor(code, message, cause) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
export const isAppError = error => {
  return error instanceof AppError;
};
export const toAppError = (error, fallbackMessage = 'Something went wrong. Please try again.') => {
  if (isAppError(error)) return error;
  if (error instanceof Error && error.message) {
    return new AppError('unknown', error.message, error);
  }
  return new AppError('unknown', fallbackMessage, error);
};
export const userMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  return toAppError(error, fallback).message;
};
