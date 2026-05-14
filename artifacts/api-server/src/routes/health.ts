import { Router, type IRouter } from "express";
import { sql, count, eq, and, gte } from "drizzle-orm";
import { db, integrationOutboxTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");

  try {
    const dbProbe = async () => {
      await db.execute(sql`SELECT 1`);

      const [pendingResult, deadLetterResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(integrationOutboxTable)
          .where(eq(integrationOutboxTable.status, "pending")),
        db
          .select({ count: count() })
          .from(integrationOutboxTable)
          .where(
            and(
              eq(integrationOutboxTable.status, "failed"),
              gte(integrationOutboxTable.attemptCount, 5),
            ),
          ),
      ]);

      return {
        pending: pendingResult[0]?.count ?? 0,
        dead_letter: deadLetterResult[0]?.count ?? 0,
      };
    };

    const outbox = await Promise.race([
      dbProbe(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000),
      ),
    ]);

    res.json({
      status: "ok",
      db: "connected",
      outbox,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      db: "disconnected",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
