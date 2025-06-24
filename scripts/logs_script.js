import fs from "fs";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log("✅ Logs directory created at:", logsDir);
} else {
  console.log("✅ Logs directory already exists at:", logsDir);
}

// Create .gitkeep file to ensure logs directory is tracked in git
const gitkeepPath = path.join(logsDir, ".gitkeep");
if (!fs.existsSync(gitkeepPath)) {
  fs.writeFileSync(gitkeepPath, "");
  console.log("✅ .gitkeep file created in logs directory");
}

// Create .gitignore to ignore actual log files
const gitignorePath = path.join(logsDir, ".gitignore");
if (!fs.existsSync(gitignorePath)) {
  const gitignoreContent = `# Ignore all log files
*.log
!.gitkeep
`;
  fs.writeFileSync(gitignorePath, gitignoreContent);
  console.log("✅ .gitignore file created in logs directory");
}
