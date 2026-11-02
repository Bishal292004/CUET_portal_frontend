import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
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
import { ErrorBox, Loading, PageHeader, Tag } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { FormDialog, type FieldDef } from "@/components/admin/FormDialog";
import { api } from "@/lib/api";
import { useAdminMutation } from "@/lib/admin-hooks";
import { seo } from "@/lib/seo";
import type { Course } from "@/lib/types";

export const Route = createFileRoute("/admin/courses")({
  head: () =>
    seo("Course Management", "Add, edit and organise the master list of postgraduate courses."),
  component: AdminCourses,
});

const FIELDS: FieldDef[] = [
  { name: "name", label: "Course name", required: true, full: true },
  { name: "category", label: "Stream / category" },
  { name: "cuetPaperCode", label: "CUET paper code" },
];

function AdminCourses() {
  const q = useQuery({
    queryKey: ["admin", "courses", "all"],
    queryFn: () => api.admin.courses.listAll(true),
  });
  const progs = useQuery({
    queryKey: ["admin", "programmes"],
    queryFn: () => api.admin.programmes.listAll(),
  });
  const [editing, setEditing] = useState<Course | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const save = useAdminMutation(
    (v: Partial<Course>) =>
      editing ? api.admin.courses.update(editing._id, v) : api.admin.courses.create(v),
    editing ? "Course updated" : "Course added",
    () => setOpen(false),
  );
  const archive = useAdminMutation(
    (id: string) => api.admin.courses.archive(id),
    "Course deactivated",
  );
  const restore = useAdminMutation(
    (id: string) => api.admin.courses.update(id, { isActive: true }),
    "Course reactivated",
  );

  const count = (cid: string) =>
    (progs.data ?? []).filter(
      (p) => (typeof p.course === "string" ? p.course : p.course._id) === cid,
    ).length;
  const pageSize = 20;
  const courses = q.data ?? [];
  const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCourses = courses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <PageHeader
        eyebrow="Content management"
        title="Courses"
        description="The master catalog that programmes link to."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add course
          </Button>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <div className="card-surface overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Paper code</TableHead>
                <TableHead>Programmes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageCourses.map((c) => (
                <TableRow key={c._id} className={c.isActive === false ? "opacity-50" : ""}>
                  <TableCell>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.slug}</p>
                  </TableCell>
                  <TableCell>{c.category ?? "—"}</TableCell>
                  <TableCell>
                    {c.cuetPaperCode ? <Tag tone="primary">{c.cuetPaperCode}</Tag> : "—"}
                  </TableCell>
                  <TableCell>{count(c._id)}</TableCell>
                  <TableCell>
                    {c.isActive === false ? <Tag>Inactive</Tag> : <Tag tone="success">Active</Tag>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {c.isActive === false ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Reactivate"
                        onClick={() => restore.mutate(c._id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Deactivate"
                        onClick={() => confirm(`Deactivate ${c.name}?`) && archive.mutate(c._id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {!q.isLoading && !q.error && (
        <PaginationControls
          page={currentPage}
          pageSize={pageSize}
          total={courses.length}
          onPageChange={setPage}
        />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit course" : "Add course"}
        fields={FIELDS}
        initial={editing ?? undefined}
        onSubmit={(v) => save.mutate(v)}
        busy={save.isPending}
      />
    </>
  );
}
