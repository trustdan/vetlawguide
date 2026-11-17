"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-W9T68MCQ";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Tag (`GTM-W9T68MCQ`) loader for public reference pages.
 *
 * Privacy guardrails (Rule 05):
 * - Unmounted on `/investigate` so private case-screening sessions fire zero
 *   external scripts, beacons, or cookies.
 * - Advertising and personalization signals default to 'denied'.
 * - Reports pathname-only `page_view` events (never leaking `?date=` or `?q=`).
 */
export function GoogleTagManager() {
  const pathname = usePathname();
  const isInvestigate = pathname?.startsWith("/investigate") ?? false;
  const hasTrackedInitialRef = useRef(false);

  useEffect(() => {
    if (isInvestigate) {
      window.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      return;
    }

    if (!pathname) return;

    if (!hasTrackedInitialRef.current) {
      hasTrackedInitialRef.current = true;
      return;
    }

    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}`,
      page_title: document.title,
    });
  }, [isInvestigate, pathname]);

  if (isInvestigate || !GTM_ID) {
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
