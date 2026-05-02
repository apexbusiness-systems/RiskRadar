import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import workspacesRouter from "./workspaces";
import obligationsRouter from "./obligations";
import remindersRouter from "./reminders";
import deliveryRouter from "./delivery";
import auditLogsRouter from "./auditLogs";
import meRouter from "./me";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dashboard", dashboardRouter);
router.use("/workspaces", workspacesRouter);
router.use("/obligations", obligationsRouter);
router.use("/obligations/:obligationId/reminder-rules", remindersRouter);
router.use("/delivery-history", deliveryRouter);
router.use("/audit-logs", auditLogsRouter);
router.use("/me", meRouter);

export default router;
