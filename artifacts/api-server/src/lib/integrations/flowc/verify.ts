import { hmacSha256Hex, timingSafeCompare } from "./hash";

const REPLAY_TOLERANCE_SECONDS = 300;

export interface VerifyOptions {
  rawBody: Buffer;
  timestamp: string;
  signature: string;
  secret: string;
  nowMs?: number;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

export function verifySignature(opts: VerifyOptions): VerifyResult {
  const { rawBody, timestamp, signature, secret, nowMs = Date.now() } = opts;

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts) || ts <= 0) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  const ageSeconds = Math.abs(nowMs / 1000 - ts);
  if (ageSeconds > REPLAY_TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale_timestamp" };
  }

  // Accept sha256=<hex> or plain hex
  const normalizedSig = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = hmacSha256Hex(secret, signedPayload);

  if (!timingSafeCompare(normalizedSig, expected)) {
    return { ok: false, reason: "signature_mismatch" };
  }

  return { ok: true };
}
