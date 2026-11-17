"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Top-Right Animated GitHub Octocat Tear-Away Corner (vision.md § 2.A).
 *
 * - Pinned in the top-right viewport corner, linking to github.com/trustdan/vetlawguide/issues.
 * - Uses motion/react spring page-peel + waving Octocat tentacle arm on hover/focus.
 * - Strictly honors prefers-reduced-motion with an instant static fallback.
 */
export function GitHubCorner() {
  const shouldReduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);

  const animatePeel = !shouldReduceMotion && active;

  return (
    <a
      href="https://github.com/trustdan/vetlawguide/issues"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Questions, bugs, or citation issues? Open a GitHub Issue"
      title="Public GitHub Issues — Questions, bugs, or citation fixes (Never include SSNs or private medical info)"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="group fixed top-0 right-0 z-50 block h-[72px] w-[72px] select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-sm:h-14 max-sm:w-14"
    >
      <svg
        viewBox="0 0 80 80"
        aria-hidden="true"
        className="h-full w-full overflow-visible drop-shadow-sm"
      >
        {/* Underlying archival corner revealed beneath the peel */}
        <polygon points="0,0 80,0 80,80" className="fill-primary" />

        {/* Octocat silhouette + waving tentacle arm */}
        <path
          d="M46.5,24.2 C48.9,21.8 51.6,22.9 51.6,22.9 C52.6,25.5 51.9,27.4 51.7,27.9 C52.9,29.2 53.6,30.9 53.6,32.9 C53.6,40.1 49.2,41.7 45.0,42.2 C45.7,42.8 46.3,44.0 46.3,45.9 C46.3,48.6 46.3,50.8 46.3,51.5 C46.3,52.0 46.7,52.7 47.7,52.5 C55.7,49.8 61.5,42.2 61.5,33.3 C61.5,22.1 52.4,13.0 41.2,13.0 C30.0,13.0 20.9,22.1 20.9,33.3 C20.9,42.3 26.7,49.9 34.8,52.5 C35.8,52.7 36.2,52.1 36.2,51.5 C36.2,51.0 36.2,49.4 36.2,47.5"
          className="fill-primary-foreground"
          transform="translate(15, -6) scale(0.82)"
        />
        <motion.path
          d="M36.2,47.5 C30.6,48.7 29.4,44.8 29.4,44.8 C28.5,42.5 27.1,41.9 27.1,41.9 C25.3,40.6 27.3,40.7 27.3,40.7 C29.3,40.8 30.4,42.8 30.4,42.8 C32.2,45.9 35.1,45.0 36.3,44.5"
          className="fill-none stroke-primary-foreground"
          strokeWidth="2.6"
          strokeLinecap="round"
          transform="translate(15, -6) scale(0.82)"
          style={{ transformOrigin: "45px 33px" }}
          animate={
            animatePeel
              ? { rotate: [0, -18, 14, -12, 0] }
              : { rotate: 0 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.65, ease: "easeInOut" }
          }
        />

        {/* Folded tear-away page flap */}
        <motion.polygon
          points={
            animatePeel
              ? "0,0 24,24 80,80 12,56"
              : "0,0 16,16 80,80 18,48"
          }
          animate={{
            points: animatePeel
              ? "0,0 24,24 80,80 10,58"
              : "0,0 16,16 80,80 20,46",
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 320, damping: 24 }
          }
          className="fill-muted stroke-border"
          strokeWidth="1"
        />
      </svg>
    </a>
  );
}
