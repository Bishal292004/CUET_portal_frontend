import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBox, Loading, PageHeader, Tag, selectClass } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { FormDialog, opts, type FieldDef } from "@/components/admin/FormDialog";
import { api } from "@/lib/api";
import { useAdminMutation } from "@/lib/admin-hooks";
import { courseOf, fmtDate, humanize } from "@/lib/format";
import { seo } from "@/lib/seo";
import { EVENT_TYPES, type EventItem } from "@/lib/types";

export const Route = createFileRoute("/admin/events")({
  head: () =>
    seo(
      "University Events",
      "Manage application windows, merit list dates, counselling rounds and deadlines.",
    ),
  component: Events,
});

function Events() {
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
    queryKey: ["admin", "events", uid],
    queryFn: () => api.admin.universities.eventsAll(uid),
    enabled: !!uid,
  });
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [open, setOpen] = useState(false);

  const fields: FieldDef[] = [
    {
      name: "type",
      label: "Event type",
      type: "select",
      required: true,
      options: opts(EVENT_TYPES, humanize),
    },
    ...(editing
      ? []
      : [
          {
            name: "courseId",
            label: "Course (optional)",
            type: "select" as const,
            options: (courses.data ?? []).map((c) => ({ value: c._id, label: c.name })),
          },
        ]),
    { name: "title", label: "Title", required: true, full: true },
    { name: "startsAt", label: "Starts", type: "date", required: true },
    { name: "endsAt", label: "Ends", type: "date" },
    { name: "sourceUrl", label: "Official notice URL", type: "url", required: true, full: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "verified", label: "Verified", type: "checkbox" },
  ];

  const save = useAdminMutation(
    (v: Record<string, unknown>) =>
      editing ? api.admin.events.patch(editing._id, v) : api.admin.universities.createEvent(uid, v),
    editing ? "Event updated" : "Event added",
    () => setOpen(false),
  );
  const remove = useAdminMutation((id: string) => api.admin.events.remove(id), "Event deleted");

  const sorted = [...(q.data ?? [])].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageEvents = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const byMonth = pageEvents.reduce<Record<string, EventItem[]>>((acc, e) => {
    const k = new Date(e.startsAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    (acc[k] ??= []).push(e);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="University events"
        description="Every date needs a link to the official notice."
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
              <Plus className="h-4 w-4" /> Add event
            </Button>
          </>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : !sorted.length ? (
        <EmptyState title="No events yet" />
      ) : (
        <>
          <div className="space-y-8">
            {Object.entries(byMonth).map(([month, list]) => (
              <div key={month}>
                <p className="mb-3 text-sm font-bold text-muted-foreground">{month}</p>
                <div className="card-surface divide-y">
                  {list.map((e) => {
                    const d = new Date(e.startsAt);
                    return (
                      <div key={e._id} className="flex items-center gap-4 p-4">
                        <div className="w-14 rounded-xl bg-primary-soft py-2 text-center text-primary">
                          <p className="text-lg leading-none font-extrabold">{d.getDate()}</p>
                          <p className="text-[10px] uppercase">
                            {d.toLocaleDateString("en-IN", { weekday: "short" })}
                          </p>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{e.title}</p>
                            <Tag tone="primary">{humanize(e.type)}</Tag>
                            {courseOf(e.course) && <Tag>{courseOf(e.course)?.name}</Tag>}
                            {e.verified ? (
                              <Tag tone="success">Verified</Tag>
                            ) : (
                              <Tag tone="warning">Unverified</Tag>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(e.startsAt)}
                            {e.endsAt ? ` → ${fmtDate(e.endsAt)}` : ""}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(e);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => confirm("Delete this event?") && remove.mutate(e._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <PaginationControls
            page={currentPage}
            pageSize={pageSize}
            total={sorted.length}
            onPageChange={setPage}
          />
        </>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit event" : "Add event"}
        fields={fields}
        initial={editing ?? { verified: true }}
        onSubmit={(v) => save.mutate(v)}
        busy={save.isPending}
      />
    </>
  );
}
