import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

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
  next();
};
