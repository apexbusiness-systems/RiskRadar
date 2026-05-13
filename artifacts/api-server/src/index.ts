import app from "./app";
import { logger } from "./lib/logger";
import { startReminderScheduler } from "./lib/reminderProcessor";

// ── Startup environment validation ──────────────────────────────────────────
const REQUIRED_ENV = ["PORT", "DATABASE_URL", "CLERK_SECRET_KEY"] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    const supabaseHint =
      key === "DATABASE_URL" && process.env.SUPABASE_URL
        ? " Supabase detected: set DATABASE_URL to the Supabase Postgres connection string (pooler URI)."
        : "";
    logger.error(`Missing required environment variable: ${key}.${supabaseHint}`);
    process.exit(1);
  }
}

const rawPort = process.env["PORT"]!;
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  logger.error(`Invalid PORT value: "${rawPort}"`);
  process.exit(1);
}

// ── Server startup ───────────────────────────────────────────────────────────
const server = app.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");

  const schedulerEnabled = process.env.ENABLE_REMINDER_SCHEDULER === "true";
  logger.info(
    { schedulerEnabled },
    "Reminder scheduler startup state evaluated",
  );
  // Scheduler is explicit opt-in to avoid duplicate workers across runtimes.
  const stopScheduler = schedulerEnabled
    ? startReminderScheduler()
    : () => logger.info("Reminder scheduler disabled");

  // Graceful shutdown on SIGTERM / SIGINT
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Received shutdown signal — draining");
    stopScheduler();
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });

    // Force exit after 10 s if still draining
    setTimeout(() => {
      logger.warn("Forced exit after drain timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
});
