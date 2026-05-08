import express from "express";
import router from "../../routes";

export const makeTestApp = (userId: string = "test_user_123") => {
  const app = express();
  app.use(express.json());

  // Intercept requiring auth and stub it
  app.use((req, res, next) => {
    // Add auth stub
    (req as any).auth = { userId };

    // Stub requireAuth via modifying require cache or injecting
    next();
  });

  app.use("/api", router);

  return app;
};
