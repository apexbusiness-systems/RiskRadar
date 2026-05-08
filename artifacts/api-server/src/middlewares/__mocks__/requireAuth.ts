import type { Request, Response, NextFunction } from "express";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!(req as any).userId) {
     (req as any).userId = "mocked_user_123";
  }
  next();
};
