import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync } from 'child_process'

let container: StartedPostgreSqlContainer;

export async function setup() {
  container = await new PostgreSqlContainer("postgres:15-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.CLERK_SECRET_KEY = "test-clerk-secret-key";
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";
  process.env.PORT = "3001";
  process.env.DEMO_DATA_MODE = "true";
  process.env.NODE_ENV = "test";

  execSync('pnpm --filter @workspace/db run push', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });
}

export async function teardown() {
  if (container) {
    await container.stop();
  }
}
