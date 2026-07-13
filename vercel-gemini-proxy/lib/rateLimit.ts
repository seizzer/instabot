// In-memory limiter — fine for a single Vercel Lambda instance's lifetime,
// but instances aren't shared, so this is a soft cap, not a hard guarantee.
// If real enforcement is needed later, swap this module for Upstash Redis
// (Vercel's recommended KV store) without touching callers.
const requestLog = new Map<string, number[]>();

export function isRateLimited(key: string, limitPerMinute: number): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = (requestLog.get(key) ?? []).filter((t) => t > windowStart);
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return timestamps.length > limitPerMinute;
}
