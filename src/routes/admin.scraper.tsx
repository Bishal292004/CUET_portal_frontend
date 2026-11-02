import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, ExternalLink, RefreshCw, ScanSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBox, Loading, PageHeader, Tag, selectClass } from "@/components/common";
import { api } from "@/lib/api";
import { useAdminMutation } from "@/lib/admin-hooks";
import { fmtDate } from "@/lib/format";
import { seo } from "@/lib/seo";
import type { ScraperDetection, ScraperMonitor, University } from "@/lib/types";

export const Route = createFileRoute("/admin/scraper")({
  head: () => seo("Scraper review", "Review admission page changes detected by the university scraper."),
  component: ScraperReview,
});

function refId(value: string | { _id: string } | undefined) {
  return typeof value === "string" ? value : value?._id;
}

function ScraperReview() {
  const [universityId, setUniversityId] = useState("");
  const universities = useQuery({
    queryKey: ["admin", "universities", "scraper"],
    queryFn: () => api.admin.universities.listAll(),
  });
  const monitors = useQuery({
    queryKey: ["admin", "scraper", "monitors"],
    queryFn: () => api.admin.scraper.monitors(),
  });
  const detections = useQuery({
    queryKey: ["admin", "scraper", "detections"],
    queryFn: () => api.admin.scraper.detections(),
    refetchInterval: 15_000,
  });

  const verifiedUniversities = (universities.data ?? []).filter(
    (u) => u.verified && !u.isArchived,
  );
  useEffect(() => {
    if (!universityId && verifiedUniversities.length) {
      const demo = verifiedUniversities.find((u) => u.name.toLowerCase().includes("central university"));
      setUniversityId((demo ?? verifiedUniversities[0])._id);
    }
  }, [universityId, verifiedUniversities]);

  const monitor = (monitors.data ?? []).find((m) => refId(m.university) === universityId);
  const setup = useAdminMutation(
    (id: string) => api.admin.scraper.createDemoMonitor(id),
    "Demo admissions monitor is ready",
  );
  const scan = useAdminMutation(
    (id: string) => api.admin.scraper.scan(id),
    "Admissions page scan completed",
  );
  const approve = useAdminMutation(
    (id: string) => api.admin.scraper.approveDetection(id),
    "Detection approved and update published",
  );
  const dismiss = useAdminMutation(
    (id: string) => api.admin.scraper.dismissDetection(id),
    "Detection dismissed",
  );

  const pending = detections.data ?? [];
  const selectedUniversity = verifiedUniversities.find((u) => u._id === universityId);

  return (
    <>
      <PageHeader
        eyebrow="Admission monitoring"
        title="Scraper review"
        description="The backend checks the demo university admissions page about once per minute. Detected changes wait here for editor or admin approval before students are notified."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              void monitors.refetch();
              void detections.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <section className="card-surface mb-8 space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Demo monitor</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Watches the admission sections on central-university.lovable.app/admissions.
          </p>
        </div>
        {universities.isLoading || monitors.isLoading ? (
          <Loading label="Loading monitor setupâ€¦" />
        ) : universities.error ? (
          <ErrorBox error={universities.error} />
        ) : monitors.error ? (
          <ErrorBox error={monitors.error} />
        ) : verifiedUniversities.length === 0 ? (
          <EmptyState title="No verified universities" description="Verify the demo university first, then return here to enable monitoring." />
        ) : (
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              className={`${selectClass} md:max-w-md`}
              value={universityId}
              onChange={(event) => setUniversityId(event.target.value)}
            >
              {verifiedUniversities.map((university: University) => (
                <option key={university._id} value={university._id}>{university.name}</option>
              ))}
            </select>
            {monitor ? (
              <>
                <Tag tone={monitor.lastStatus === "ERROR" ? "warning" : "success"}>
                  {monitor.isEnabled ? "Monitoring enabled" : "Monitoring disabled"}
                </Tag>
                {monitor.isEnabled ? (
                  <Button disabled={scan.isPending} onClick={() => scan.mutate(monitor._id)}>
                    <ScanSearch className="h-4 w-4" /> Scan now
                  </Button>
                ) : (
                  <Button disabled={setup.isPending} onClick={() => setup.mutate(universityId)}>
                    Enable monitor
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  {monitor.lastCheckedAt ? `Last scan: ${fmtDate(monitor.lastCheckedAt)}` : "Not scanned yet"}
                </span>
              </>
            ) : (
              <Button disabled={!universityId || setup.isPending} onClick={() => setup.mutate(universityId)}>
                Enable demo monitor
              </Button>
            )}
          </div>
        )}
        {monitor?.lastStatus === "ERROR" && monitor.lastError && (
          <p role="alert" className="text-sm text-destructive">Last scan failed: {monitor.lastError}</p>
        )}
        {selectedUniversity && !selectedUniversity.verified && (
          <p className="text-sm text-warning">Verify this university before enabling its monitor.</p>
        )}
      </section>

      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold">Pending detections</h2>
        <Tag>{pending.length}</Tag>
      </div>
      {detections.isLoading ? (
        <Loading />
      ) : detections.error ? (
        <ErrorBox error={detections.error} />
      ) : pending.length === 0 ? (
        <EmptyState title="Nothing needs review" description="New admission page changes will appear here after a scan." />
      ) : (
        <div className="space-y-4">
          {pending.map((detection: ScraperDetection) => {
            const university = typeof detection.university === "string"
              ? undefined
              : detection.university as University;
            const busy = approve.isPending || dismiss.isPending;
            return (
              <article key={detection._id} className="card-surface space-y-4 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{detection.suggestedTitle || "Admission page changed"}</h3>
                      <Tag tone="warning">Pending review</Tag>
                      {university && <Tag>{university.name}</Tag>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Detected {fmtDate(detection.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={busy} onClick={() => approve.mutate(detection._id)}>
                      <Check className="h-4 w-4" /> Approve & notify
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => dismiss.mutate(detection._id)}>
                      <X className="h-4 w-4" /> Dismiss
                    </Button>
                  </div>
                </div>
                <p className="text-sm">{detection.suggestedSummary || detection.newText}</p>
                {detection.previousText && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">Previous page text</summary>
                    <p className="mt-2 rounded-lg bg-muted p-3 text-muted-foreground">{detection.previousText}</p>
                  </details>
                )}
                {detection.sourceUrl && (
                  <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={detection.sourceUrl} target="_blank" rel="noreferrer">
                    View source page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
