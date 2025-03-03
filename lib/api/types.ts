
// Define a custom error type that extends the built-in Error
export interface CustomError extends Error {
    originalError?: unknown; // Use 'unknown' instead of 'any' for better type safety
}