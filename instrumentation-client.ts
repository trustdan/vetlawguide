import { initBotId } from "botid/client/core";

declare global {
  interface Window {
    __vlgBotIdInitialized?: boolean;
  }
}

// Activate Vercel BotID challenge interception at most ONCE per window lifetime
// (calling `initBotId()` twice deadlocks `window.V_C.push` inside `botid/client/core`),
// skipping eager init on the air-gapped `/investigate` workspace (Rule 05 & ADR-0003).
if (
  typeof window !== "undefined" &&
  !window.__vlgBotIdInitialized &&
  Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV) &&
  !window.location.pathname.startsWith("/investigate")
) {
  window.__vlgBotIdInitialized = true;
  initBotId({
    protect: [{ path: "/api/chat", method: "POST" }],
  });
}
