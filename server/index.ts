import { config } from "./config.js";
import { runMigrations, closeDatabase } from "./db/database.js";
import { startServer, stopServer } from "./server.js";
import { startTelegramBot, stopTelegramBot } from "./telegram/bot.js";
import {
  setupActivityMonitoring,
  sendStartupMessage,
  sendShutdownMessage,
} from "./telegram/monitoring.js";

async function main() {
  console.log("Starting MyAgentive...");
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Domain: ${config.domain}`);

  // Run database migrations
  console.log("Running database migrations...");
  runMigrations();

  // Set up activity monitoring
  setupActivityMonitoring();

  // Start Express server
  await startServer();

  // Start Telegram bot
  await startTelegramBot();

  // Send startup notification
  await sendStartupMessage();

  console.log("MyAgentive is ready!");
}

// Graceful shutdown
async function shutdown() {
  console.log("\nShutting down...");

  try {
    await sendShutdownMessage();
  } catch (e) {
    console.error("Error sending shutdown message:", e);
  }

  await stopTelegramBot();
  await stopServer();
  closeDatabase();

  console.log("Shutdown complete");
  process.exit(0);
}

// Handle signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});

// Start the application
main().catch((error) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
