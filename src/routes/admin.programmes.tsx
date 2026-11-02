import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Archive, BadgeCheck, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBox, Loading, PageHeader, Tag, selectClass } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { FormDialog, type FieldDef } from "@/components/admin/FormDialog";
import { api } from "@/lib/api";
import { useAdminMutation } from "@/lib/admin-hooks";
import { courseOf, inr, refId, uniOf } from "@/lib/format";
import { seo } from "@/lib/seo";
import type { Programme } from "@/lib/types";

export const Route = createFileRoute("/admin/programmes")({
  head: () =>
    seo("Programme Management", "Map courses to universities with seats, fees and eligibility."),
  component: AdminProgrammes,
});

function AdminProgrammes() {
  const q = useQuery({
    queryKey: ["admin", "programmes"],
    queryFn: () => api.admin.programmes.listAll(),
  });
  const unis = useQuery({
    queryKey: ["admin", "universities"],
    queryFn: () => api.admin.universities.listAll(),
  });
  const courses = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => api.admin.courses.listAll(),
  });
  const [uniFilter, setUniFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Programme | null>(null);
  const [open, setOpen] = useState(false);

  const fields: FieldDef[] = [
    ...(editing
      ? []
      : [
          {
            name: "universityId",
            label: "University",
            type: "select" as const,
            required: true,
            options: (unis.data ?? []).map((u) => ({ value: u._id, label: u.name })),
          },
          {
            name: "courseId",
            label: "Course",
            type: "select" as const,
            required: true,
            options: (courses.data ?? []).map((c) => ({ value: c._id, label: c.name })),
          },
        ]),
    { name: "programmeName", label: "Programme name", full: true },
    { name: "durationYears", label: "Duration (years)", type: "number" },
    { name: "annualFee", label: "Annual fee (₹)", type: "number" },
    { name: "totalSeats", label: "Total seats", type: "number" },
    { name: "seatsAvailable", label: "Seats available", type: "number" },
    { name: "eligibility", label: "Eligibility", type: "textarea" },
    { name: "sourceUrl", label: "Source URL", type: "url", full: true },
  ];

  const save = useAdminMutation(
    (v: Record<string, unknown>) =>
      editing ? api.admin.programmes.update(editing._id, v) : api.admin.programmes.create(v),
    editing ? "Programme updated" : "Programme added",
    () => setOpen(false),
  );
  const verify = useAdminMutation(
    (id: string) => api.admin.programmes.verify(id),
    "Programme verified",
  );
  const archive = useAdminMutation(
    (id: string) => api.admin.programmes.archive(id),
    "Programme archived",
  );

  const rows = (q.data ?? []).filter(
    (p) => !p.isArchived && (!uniFilter || refId(p.university) === uniFilter),
  );
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <PageHeader
        eyebrow="Content management"
        title="Programmes"
        description="Each programme links one course to one university."
        actions={
          <>
            <select
              className={`${selectClass} w-60`}
              value={uniFilter}
              onChange={(e) => {
                setUniFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All universities</option>
              {(unis.data ?? []).map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add programme
            </Button>
          </>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <>
          <div className="card-surface overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Programme</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>
                      <p className="font-semibold">{p.programmeName ?? courseOf(p.course)?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {courseOf(p.course)?.name} · {p.durationYears ?? "—"} yrs
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{uniOf(p.university)?.name}</TableCell>
                    <TableCell className="text-sm">
                      {p.seatsAvailable ?? "—"} / {p.totalSeats ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{inr(p.annualFee)}</TableCell>
                    <TableCell>
                      {p.verified ? (
                        <Tag tone="success">Verified</Tag>
                      ) : (
                        <Tag tone="warning">Draft</Tag>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!p.verified && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Verify"
                          onClick={() => verify.mutate(p._id)}
                        >
                          <BadgeCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => confirm("Archive this programme?") && archive.mutate(p._id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            page={currentPage}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
          />
        </>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit programme" : "Add programme"}
        fields={fields}
        initial={editing ?? undefined}
        onSubmit={(v) => save.mutate(v)}
        busy={save.isPending}
      />
    </>
  );
}
