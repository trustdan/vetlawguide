"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useConsent } from "@/components/providers/consent-provider";

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-W9T68MCQ";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    google_tag_manager?: unknown;
  }
}

/**
 * Consent-gated Google Tag (`GTM-W9T68MCQ`) loader for public reference pages.
 *
 * Privacy guardrails (Rule 05 & ADR-0003):
 * - Strictly gated on `performanceAllowed` (`vlg_consent`) — zero third-party
 *   requests to `googletagmanager.com` occur before explicit opt-in or after opt-out.
 * - Unconditionally disabled on `/investigate`; if a visitor previously opted in
 *   on a public page and navigates via SPA `<Link>` into `/investigate`, forces a
 *   clean document load so `gtm.js` is purged from memory and the HTTP `/investigate`
 *   `Content-Security-Policy` header is enforced by the browser.
 * - Reports pathname-only `page_view` events (never leaking `?date=` or `?q=`).
 */
export function GoogleTagManager() {
  const pathname = usePathname();
  const { performanceAllowed } = useConsent();
  const isInvestigate = pathname?.startsWith("/investigate") ?? false;

  useEffect(() => {
    if (isInvestigate) {
      const gtmScriptEl = document.getElementById("vlg-gtm-script");
      const gtmInitEl = document.getElementById("vlg-gtm-init");
      const gtmLoadedInDom = Boolean(window.google_tag_manager || gtmScriptEl);
      gtmScriptEl?.remove();
      gtmInitEl?.remove();
      window.gtag = undefined;
      window.dataLayer = [];
      if (gtmLoadedInDom) {
        window.google_tag_manager = undefined;
        window.location.replace(pathname || "/investigate");
      }
      return;
    }

    if (!performanceAllowed || !pathname) {
      return;
    }

    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}`,
      page_title: document.title,
    });
  }, [isInvestigate, pathname, performanceAllowed]);

  if (isInvestigate || !performanceAllowed || !GTM_ID) {
    return null;
  }

  return (
    <>
      <Script id="vlg-gtm-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'granted'
          });
          gtag('js', new Date());
          window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        `}
      </Script>
      <Script
        id="vlg-gtm-script"
        src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
