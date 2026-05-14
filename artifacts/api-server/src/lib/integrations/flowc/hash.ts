import crypto from "node:crypto";

export function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function hmacSha256Hex(secret: string, data: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function timingSafeCompare(a: string, b: string): boolean {
  // Pad shorter string to avoid length timing leak, then compare
  const aLen = Buffer.byteLength(a, "utf8");
  const bLen = Buffer.byteLength(b, "utf8");
  const maxLen = Math.max(aLen, bLen);
  const bufA = Buffer.alloc(maxLen);
  const bufB = Buffer.alloc(maxLen);
  bufA.write(a, "utf8");
  bufB.write(b, "utf8");
  const equal = crypto.timingSafeEqual(bufA, bufB);
  // Lengths must also match for true equality
  return equal && aLen === bLen;
}
