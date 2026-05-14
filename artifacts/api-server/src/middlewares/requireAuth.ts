import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  userId: string;
  clerkAuth: ReturnType<typeof getAuth>;
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    req.log?.warn(
      { path: req.path, method: req.method },
      "security.auth.unauthorized",
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthenticatedRequest).userId = userId;
  (req as AuthenticatedRequest).clerkAuth = auth;
  // Best-effort session-level user context for RLS (definitive enforcement uses withUserContext in handlers)
  // Note: connection pool may not reuse the same connection for subsequent queries; withUserContext is authoritative.
  db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`).catch(() => undefined);
  next();
};
