import { db } from "./index";
import { sql } from "drizzle-orm";

export async function withUserContext<T>(
  userId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return fn(tx as unknown as typeof db);
  });
}

export async function withServiceContext<T>(
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', '', true)`);
    return fn(tx as unknown as typeof db);
  });
}
