import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, ExternalLink, Megaphone, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBox, Loading, PageHeader, Tag, selectClass } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { FormDialog, opts, type FieldDef } from "@/components/admin/FormDialog";
import { api } from "@/lib/api";
import { useAdminMutation } from "@/lib/admin-hooks";
import { courseOf, fmtDate, humanize } from "@/lib/format";
import { seo } from "@/lib/seo";
import { UPDATE_TYPES, type Update } from "@/lib/types";

export const Route = createFileRoute("/admin/announcements")({
  head: () =>
    seo(
      "Announcements",
      "Broadcast merit lists, notices and date changes to students following each university.",
    ),
  component: Announcements,
});

function Announcements() {
  const unis = useQuery({
    queryKey: ["admin", "universities"],
    queryFn: () => api.admin.universities.listAll(),
  });
  const courses = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => api.admin.courses.listAll(),
  });
  const [uid, setUid] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (!uid && unis.data?.length) setUid(unis.data[0]._id);
  }, [unis.data, uid]);
  const q = useQuery({
    queryKey: ["admin", "updates", uid],
    queryFn: () => api.admin.universities.updatesAll(uid),
    enabled: !!uid,
  });
  const [editing, setEditing] = useState<Update | null>(null);
  const [open, setOpen] = useState(false);

  const fields: FieldDef[] = [
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: opts(UPDATE_TYPES, humanize),
    },
    ...(editing
      ? []
      : [
          {
            name: "courseId",
            label: "Course (optional — leave empty for all)",
            type: "select" as const,
            options: (courses.data ?? []).map((c) => ({ value: c._id, label: c.name })),
          },
        ]),
    { name: "title", label: "Title", required: true, full: true },
    { name: "summary", label: "Summary", type: "textarea" },
    { name: "sourceUrl", label: "Official notice URL", type: "url" },
    { name: "publishedAt", label: "Published on", type: "date" },
  ];

  const save = useAdminMutation(
    (v: Record<string, unknown>) =>
      editing
        ? api.admin.updates.patch(editing._id, v)
        : api.admin.universities.createUpdate(uid, v),
    editing ? "Announcement updated" : "Announcement published — followers will be notified",
    () => setOpen(false),
  );
  const remove = useAdminMutation(
    (id: string) => api.admin.updates.remove(id),
    "Announcement deleted",
  );
  const notify = useAdminMutation(
    (id: string) => api.admin.updates.notify(id),
    "Notifications re-queued",
  );
  const pageSize = 20;
  const updates = q.data ?? [];
  const totalPages = Math.max(1, Math.ceil(updates.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageUpdates = updates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <PageHeader
        eyebrow="Broadcast"
        title="Announcements & updates"
        description="Publishing an update notifies every student following that university."
        actions={
          <>
            <select
              className={`${selectClass} w-64`}
              value={uid}
              onChange={(e) => {
                setUid(e.target.value);
                setPage(1);
              }}
            >
              {(unis.data ?? []).map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button
              disabled={!uid}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New announcement
            </Button>
          </>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : !q.data?.length ? (
        <EmptyState title="No announcements for this university" />
      ) : (
        <>
          <div className="space-y-3">
            {pageUpdates.map((x) => (
              <div key={x._id} className="card-surface flex gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  {x.type === "MERIT_LIST" ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <Megaphone className="h-4 w-4" />
                  )}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{x.title}</p>
                    <Tag tone="primary">{humanize(x.type)}</Tag>
                    {courseOf(x.course) && <Tag>{courseOf(x.course)?.name}</Tag>}
                    {x.origin === "SCRAPER" && <Tag tone="warning">Auto-detected</Tag>}
                    {x.notificationsQueued ? (
                      <Tag tone="success">Notified</Tag>
                    ) : (
                      <Tag>Not sent</Tag>
                    )}
                  </div>
                  {x.summary && <p className="mt-1 text-sm text-muted-foreground">{x.summary}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDate(x.publishedAt)}</p>
                </div>
                <div className="flex items-start">
                  {x.sourceUrl && (
                    <Button size="icon" variant="ghost" asChild>
                      <a href={x.sourceUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Re-send notifications"
                    onClick={() => notify.mutate(x._id)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(x);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => confirm("Delete this announcement?") && remove.mutate(x._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <PaginationControls
            page={currentPage}
            pageSize={pageSize}
            total={updates.length}
            onPageChange={setPage}
          />
        </>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit announcement" : "New announcement"}
        fields={fields}
        initial={editing ?? undefined}
        onSubmit={(v) => save.mutate(v)}
        busy={save.isPending}
      />
    </>
  );
}
