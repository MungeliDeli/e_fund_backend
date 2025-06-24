import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  ErrorFactory,
  isOperationalError,
  normalizeError,
} from "../src/utils/appError.js";

console.log("🧪 Testing Error Handling Utilities...\n");

// Test basic AppError
console.log("1. Basic AppError:");
const basicError = new AppError("Something went wrong", 500);
console.log(JSON.stringify(basicError.toJSON(), null, 2));
console.log("Is operational:", isOperationalError(basicError));
console.log();

// Test ValidationError
console.log("2. ValidationError:");
const validationError = new ValidationError("Email is required", "email", "");
console.log(JSON.stringify(validationError.toJSON(), null, 2));
console.log();

// Test ErrorFactory
console.log("3. ErrorFactory examples:");
const factoryErrors = [
  ErrorFactory.invalidCredentials(),
  ErrorFactory.userNotFound(),
  ErrorFactory.emailExists(),
  ErrorFactory.requiredField("password"),
  ErrorFactory.tooManyLoginAttempts(),
];

factoryErrors.forEach((error, index) => {
  console.log(`${index + 1}. ${error.constructor.name}:`);
  console.log(JSON.stringify(error.toJSON(), null, 2));
  console.log();
});

// Test error normalization
console.log("4. Error Normalization:");

// Simulate PostgreSQL unique constraint violation
const pgError = {
  code: "23505",
  constraint: "users_email_unique",
  message: "duplicate key value violates unique constraint",
};

const normalizedPgError = normalizeError(pgError);
console.log("PostgreSQL error normalized:");
console.log(JSON.stringify(normalizedPgError.toJSON(), null, 2));
console.log();

// Simulate JWT error
const jwtError = {
  name: "JsonWebTokenError",
  message: "invalid token",
};

const normalizedJwtError = normalizeError(jwtError);
console.log("JWT error normalized:");
console.log(JSON.stringify(normalizedJwtError.toJSON(), null, 2));
console.log();

// Test unknown error normalization
const unknownError = new Error("Some random error");
const normalizedUnknownError = normalizeError(unknownError);
console.log("Unknown error normalized:");
console.log(JSON.stringify(normalizedUnknownError.toJSON(), null, 2));
console.log("Is operational:", isOperationalError(normalizedUnknownError));
console.log();

console.log("✅ Error handling test completed!");
console.log(
  "💡 These utilities provide consistent error handling across your application."
);
