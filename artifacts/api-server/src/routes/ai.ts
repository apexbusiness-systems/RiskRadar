import { Router } from "express";
import type { Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../middlewares/requireAuth";
import { groqExtractJson } from "../lib/ai/groq";

const router = Router();

interface EnrichedObligation {
  title: string;
  category: string;
  notes: string;
  suggestedDaysBefore: number;
  ownerName: string;
  ownerEmail: string;
}

router.post(
  "/enrich-obligation",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (process.env.ENABLE_GROQ_AI !== "true") {
      res
        .status(503)
        .json({ error: "AI enrichment is not enabled", code: "ai_disabled" });
      return;
    }

    const { rawText } = req.body as { rawText?: unknown };

    if (typeof rawText !== "string" || rawText.trim().length === 0) {
      res.status(400).json({ error: "rawText must be a non-empty string" });
      return;
    }

    if (rawText.length > 2000) {
      res
        .status(400)
        .json({ error: "rawText must not exceed 2000 characters" });
      return;
    }

    const result = await groqExtractJson<EnrichedObligation>(
      [
        {
          role: "system",
          content:
            "You are a compliance obligation data extractor. Extract structured fields from the user's description of a business obligation. Be concise and accurate. Return only what you can confidently infer from the text.",
        },
        {
          role: "user",
          content: rawText,
        },
      ],
      {
        schemaName: "enriched_obligation",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            notes: { type: "string" },
            suggestedDaysBefore: { type: "number" },
            ownerName: { type: "string" },
            ownerEmail: { type: "string" },
          },
          required: [
            "title",
            "category",
            "notes",
            "suggestedDaysBefore",
            "ownerName",
            "ownerEmail",
          ],
          additionalProperties: false,
        },
      },
    );

    if (result === null) {
      res
        .status(502)
        .json({ error: "AI enrichment failed", code: "ai_error" });
      return;
    }

    res.status(200).json(result);
  },
);

export default router;
