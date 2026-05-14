-- Enable RLS on all workspace-scoped tables
ALTER TABLE "obligations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminder_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_outbox" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- obligations: direct workspace_id
CREATE POLICY obligations_workspace_isolation ON "obligations"
  USING (
    current_setting('app.current_user_id', true) = ''
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
  );
--> statement-breakpoint

-- reminder_rules: workspace via obligation_id → obligations.workspace_id
CREATE POLICY reminder_rules_workspace_isolation ON "reminder_rules"
  USING (
    current_setting('app.current_user_id', true) = ''
    OR obligation_id IN (
      SELECT id FROM obligations
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE clerk_user_id = current_setting('app.current_user_id', true)
      )
    )
  );
--> statement-breakpoint

-- delivery_history: workspace via obligation_id → obligations.workspace_id
CREATE POLICY delivery_history_workspace_isolation ON "delivery_history"
  USING (
    current_setting('app.current_user_id', true) = ''
    OR obligation_id IN (
      SELECT id FROM obligations
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE clerk_user_id = current_setting('app.current_user_id', true)
      )
    )
  );
--> statement-breakpoint

-- audit_logs: direct workspace_id (nullable — null rows are visible in service mode only)
CREATE POLICY audit_logs_workspace_isolation ON "audit_logs"
  USING (
    current_setting('app.current_user_id', true) = ''
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
  );
--> statement-breakpoint

-- workspace_members: workspace_id directly
CREATE POLICY workspace_members_isolation ON "workspace_members"
  USING (
    current_setting('app.current_user_id', true) = ''
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members wm2
      WHERE wm2.clerk_user_id = current_setting('app.current_user_id', true)
    )
  );
--> statement-breakpoint

-- FlowC tables: only accessible in service mode (internal routes bypass user context)
CREATE POLICY integration_receipts_service_only ON "integration_receipts"
  USING (current_setting('app.current_user_id', true) = '');
--> statement-breakpoint

CREATE POLICY integration_outbox_service_only ON "integration_outbox"
  USING (current_setting('app.current_user_id', true) = '');
