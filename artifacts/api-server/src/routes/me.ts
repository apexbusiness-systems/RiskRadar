import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { seedDemoData } from "../lib/seed";
import type { Request, Response } from "express";

const router = Router();

// POST /api/me/seed — seeds demo data for newly authenticated user
router.post("/seed", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { email, name } = req.body;

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  try {
    const result = await seedDemoData(userId, email, name);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "seed error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
