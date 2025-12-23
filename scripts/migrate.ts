import { runMigrations, closeDatabase } from "../server/db/database.js";

console.log("Running database migrations...");

try {
  runMigrations();
  console.log("Migrations completed successfully");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  closeDatabase();
}
