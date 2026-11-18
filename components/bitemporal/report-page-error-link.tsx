import { ExternalLink } from "lucide-react";
import { buildCitationFixIssueUrl } from "@/lib/support-links";
import { cn } from "@/lib/utils";

export function ReportPageErrorLink({
  canonicalPath,
  corpusReleaseId,
  authority,
  className,
}: {
  canonicalPath: string;
  corpusReleaseId: string;
  authority: string;
  className?: string;
}) {
  const issueUrl = buildCitationFixIssueUrl({
    canonicalPath,
    corpusReleaseId,
    authority,
  });
  if (!issueUrl) return null;

  return (
    <a
      data-testid="report-page-error-link"
      href={issueUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 hover:opacity-80",
        className,
      )}
    >
      <span>Report an error on this page</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}
