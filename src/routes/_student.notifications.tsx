import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBox, Loading, PageHeader } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { api } from "@/lib/api";
import { timeAgo, uniOf } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_student/notifications")({
  head: () =>
    seo("Notifications", "Counselling dates, cutoff releases and university announcements."),
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const q = useQuery({
    queryKey: ["notifications", { unread, page }],
    queryFn: () => api.me.notifications.list({ unread, page }),
    refetchInterval: 60_000,
  });
  const refresh = () =>
    qc.invalidateQueries({
      predicate: (x) => ["notifications", "unread", "dashboard"].includes(String(x.queryKey[0])),
    });
  const read = useMutation({
    mutationFn: (id: string) => api.me.notifications.markRead(id),
    onSuccess: refresh,
  });
  const all = useMutation({
    mutationFn: () => api.me.notifications.markAllRead(),
    onSuccess: refresh,
  });

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={`${q.data?.unreadCount ?? 0} unread`}
        actions={
          <>
            <Button
              variant={unread ? "default" : "outline"}
              onClick={() => {
                setUnread(!unread);
                setPage(1);
              }}
            >
              {unread ? "Showing unread" : "Show unread only"}
            </Button>
            <Button variant="outline" onClick={() => all.mutate()} disabled={!q.data?.unreadCount}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          </>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : !q.data?.notifications.length ? (
        <EmptyState title="You're all caught up" />
      ) : (
        <>
          <div className="card-surface divide-y">
            {q.data.notifications.map((n) => (
              <div key={n._id} className={`flex gap-4 p-5 ${n.readAt ? "" : "bg-primary-soft/40"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    {!n.readAt && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {uniOf(n.university)?.name} · {timeAgo(n.createdAt)}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  {n.link && (
                    <a href={n.link} target="_blank" rel="noreferrer" className="text-primary">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {!n.readAt && (
                    <Button size="sm" variant="ghost" onClick={() => read.mutate(n._id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <PaginationControls
            page={q.data.pagination.page}
            pageSize={pageSize}
            total={q.data.pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
}
