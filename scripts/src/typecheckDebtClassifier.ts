import { spawnSync } from 'node:child_process';

type ErrorCode = 'TS6305' | 'TS7006' | 'STRICTNESS_OTHER';

const CHECK_COMMANDS = [
  { label: 'root', cmd: 'pnpm', args: ['run', 'typecheck'] },
  { label: 'recursive', cmd: 'pnpm', args: ['-r', '--if-present', 'run', 'typecheck'] },
] as const;

function runChecks(): { output: string; exitCode: number } {
  let combinedOutput = '';
  let exitCode = 0;

  for (const check of CHECK_COMMANDS) {
    const result = spawnSync(check.cmd, check.args, { encoding: 'utf8' });
    combinedOutput += `\n# ${check.label}: ${check.cmd} ${check.args.join(' ')}\n`;
    combinedOutput += result.stdout ?? '';
    combinedOutput += result.stderr ?? '';

    if (result.status !== 0) {
      exitCode = result.status ?? 1;
    }
  }

  return { output: combinedOutput, exitCode };
}

function classify(output: string): Record<ErrorCode, string[]> {
  const lines = output.split('\n');
  const buckets: Record<ErrorCode, string[]> = {
    TS6305: [],
    TS7006: [],
    STRICTNESS_OTHER: [],
  };

  for (const line of lines) {
    if (!line.includes('error TS')) continue;
    if (line.includes('TS6305')) {
      buckets.TS6305.push(line.trim());
      continue;
    }
    if (line.includes('TS7006')) {
      buckets.TS7006.push(line.trim());
      continue;
    }
    if (/TS(7\d{3}|24\d{2}|25\d{2})/.test(line)) {
      buckets.STRICTNESS_OTHER.push(line.trim());
    }
  }

  return buckets;
}

const { output, exitCode } = runChecks();
const buckets = classify(output);

const report = {
  generatedAt: new Date().toISOString(),
  commands: CHECK_COMMANDS.map((c) => `${c.cmd} ${c.args.join(' ')}`),
  counts: {
    TS6305: buckets.TS6305.length,
    TS7006: buckets.TS7006.length,
    STRICTNESS_OTHER: buckets.STRICTNESS_OTHER.length,
  },
  errors: buckets,
};

console.log(JSON.stringify(report, null, 2));
if (exitCode !== 0) process.exit(exitCode);
