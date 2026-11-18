import { initBotId } from "botid/client/core";

// Activate Vercel BotID challenge interception only on deployed Vercel environments
// and never on the strictly air-gapped `/investigate` workspace (Rule 05 & ADR-0003).
if (
  typeof window !== "undefined" &&
  Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV) &&
  !window.location.pathname.startsWith("/investigate")
) {
  initBotId({
    protect: [{ path: "/api/chat", method: "POST" }],
  });
}
