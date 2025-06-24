import logger from "../src/utils/logger.js";

// Test basic logging levels
console.log("🧪 Testing Logger Utility...\n");

// Test different log levels
logger.error("This is an error message");
logger.warn("This is a warning message");
logger.info("This is an info message");
logger.http("This is an HTTP message");
logger.debug("This is a debug message");

// Test logging with context
logger.logWithContext("info", "User action performed", {
  userId: 123,
  action: "login",
  timestamp: new Date().toISOString(),
});

// Test database logging helpers
logger.db.query("SELECT * FROM users WHERE id = $1", 45, 1);
logger.db.connection("Database connection established");

// Test API logging helpers
logger.api.request("GET", "/api/users", "192.168.1.1", "Mozilla/5.0");
logger.api.response("GET", "/api/users", 200, 150);

// Test security logging
logger.security.loginAttempt("user@example.com", "192.168.1.1", true);
logger.security.loginAttempt("hacker@example.com", "192.168.1.100", false);
logger.security.tokenGenerated(123, "access_token");

// Test error logging with stack trace
try {
  throw new Error("Sample error for testing");
} catch (error) {
  logger.api.error("POST", "/api/test", error, 123);
}

console.log("\n✅ Logger test completed! Check the console output above.");
console.log(
  "📁 In production, logs will also be written to the logs/ directory."
);
