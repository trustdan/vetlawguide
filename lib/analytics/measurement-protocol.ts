export interface MPEvent {
  name: string;
  params?: Record<string, string | number | boolean>;
}

/**
 * Extracts the GA4 `client_id` (`<id>.<ts>`) from a `_ga` cookie (`GA1.1.<id>.<ts>`),
 * falling back to a fresh ephemeral UUID when `_ga` is absent.
 */
export function resolveClientId(gaCookieValue: string | undefined): string {
  const parts = gaCookieValue?.split(".") ?? [];
  return parts.length >= 4 ? parts.slice(-2).join(".") : crypto.randomUUID();
}

/**
 * Sends a server-side GA4 Measurement Protocol event when both `GA_MEASUREMENT_ID`
 * and `GA_API_SECRET` are configured. Gracefully no-ops in local/CI environments.
 */
export async function sendMeasurementProtocolEvent(
  clientId: string,
  event: MPEvent,
): Promise<void> {
  const measurementId = process.env.GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA_API_SECRET;
  if (!measurementId || !apiSecret) {
    return;
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    measurementId,
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      events: [event],
    }),
  });

  if (!res.ok) {
    console.error("sendMeasurementProtocolEvent failed:", res.status);
  }
}
