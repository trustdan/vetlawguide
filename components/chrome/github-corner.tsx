"use client";

/**
 * Top-Right Diagonal Corner-Peeking GitHub Octocat Ribbon.
 *
 * Adapted from Ideation-Lab-Web/components/GithubCornerFold.tsx:
 * - Authentic Octocat silhouette (viewBox="0 0 250 250") + waving arm anchored at (130px, 106px).
 * - Outer <a> and <svg> are pointer-events-none while the diagonal triangle and Octocat SVG
 *   paths are pointer-events-auto so underlying <SiteHeader /> controls are never blocked.
 * - Waving arm animation (@keyframes octocatWave) runs on hover/focus-visible and halts
 *   automatically under prefers-reduced-motion: reduce.
 */
export function GitHubCorner() {
  return (
    <a
      data-testid="github-corner"
      href="https://github.com/trustdan/vetlawguide/issues"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Questions, bugs, or citation issues? Open a GitHub Issue"
      title="Public GitHub Issues — Questions, bugs, or citation fixes (Never include SSNs or private medical info)"
      className="group pointer-events-none fixed top-0 right-0 z-50 block cursor-pointer select-none focus:outline-none"
    >
      <svg
        width="96"
        height="96"
        viewBox="0 0 250 250"
        aria-hidden="true"
        className="pointer-events-none h-14 w-14 text-background drop-shadow-sm transition-transform duration-200 group-hover:scale-[1.03] group-focus-visible:scale-[1.03] group-hover:text-accent-foreground group-focus-visible:text-accent-foreground dark:text-accent-foreground sm:h-20 sm:w-20 md:h-24 md:w-24"
      >
        <defs>
          <path id="vlg-octo-ribbon-text-path" d="M 80,28 L 245,28" />
        </defs>

        {/* Top-Right Diagonal Triangle Background */}
        <path
          data-testid="github-corner-triangle"
          d="M0,0 L250,0 L250,250 Z"
          className="pointer-events-auto fill-foreground transition-colors duration-200 group-hover:fill-accent group-focus-visible:fill-accent group-focus-visible:stroke-primary group-focus-visible:stroke-[8px] dark:fill-accent dark:group-hover:opacity-90"
        />

        {/* Crisp Corner Label Above Octocat (Shown at md+ where 96px renders cleanly) */}
        <text
          fill="currentColor"
          fontSize="14"
          fontWeight="700"
          letterSpacing="1.8"
          textAnchor="middle"
          className="pointer-events-auto hidden font-mono uppercase opacity-90 transition-opacity group-hover:opacity-100 md:block"
        >
          <textPath
            href="#vlg-octo-ribbon-text-path"
            startOffset="50%"
            textAnchor="middle"
          >
            ISSUES
          </textPath>
        </text>

        {/* Waving Octocat Arm */}
        <path
          d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
          fill="currentColor"
          className="octo-arm pointer-events-auto"
          style={{ transformOrigin: "130px 106px" }}
        />

        {/* Octocat Body */}
        <path
          d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.8,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z"
          fill="currentColor"
          className="pointer-events-auto"
        />
      </svg>
    </a>
  );
}
