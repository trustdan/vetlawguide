/**
 * Per-instance serverless in-memory rate-limit backstop (`10` msgs / `5` min per IP).
 *
 * Production architecture:
 * 1. Primary shared edge throttle: Vercel Firewall custom `rate_limit` rule on
 *    `POST /api/chat` (`$0` WAF layer, documented in `POST_CODE_LAUNCH_AND_OPS_GUIDE.md`).
 * 2. Secondary per-instance backstop: This process-local `Map` caps bursts inside
 *    any warm Node.js function instance and during local/preview testing.
 */
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 10;
const MAX_TRACKED_KEYS = 2000;

const requestLog = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  if (requestLog.size > MAX_TRACKED_KEYS) {
    for (const [k, ts] of requestLog.entries()) {
      const active = ts.filter((t) => now - t < WINDOW_MS);
      if (active.length === 0) {
        requestLog.delete(k);
      } else {
        requestLog.set(k, active);
      }
    }
  }
  const timestamps = (requestLog.get(key) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );

  if (timestamps.length >= MAX_REQUESTS) {
    requestLog.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export function resetRateLimitForTests(): void {
  requestLog.clear();
}
