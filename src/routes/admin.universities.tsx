import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Archive, BadgeCheck, Pencil, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBox, Loading, PageHeader, Tag, UniAvatar, selectClass } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { FormDialog, opts, type FieldDef } from "@/components/admin/FormDialog";
import { api } from "@/lib/api";
import { useAdminMutation } from "@/lib/admin-hooks";
import { fmtDate, humanize, STATUS_LABEL } from "@/lib/format";
import { seo } from "@/lib/seo";
import { ADMISSION_STATUS, UNIVERSITY_TYPES, type University } from "@/lib/types";

export const Route = createFileRoute("/admin/universities")({
  head: () =>
    seo("University Management", "Add, edit, verify and archive participating universities."),
  component: AdminUniversities,
});

const FIELDS: FieldDef[] = [
  { name: "name", label: "Name", required: true, full: true },
  { name: "shortName", label: "Short name" },
  { name: "type", label: "Type", type: "select", options: opts(UNIVERSITY_TYPES, humanize) },
  { name: "state", label: "State", required: true },
  { name: "city", label: "City" },
  { name: "websiteUrl", label: "Website URL", type: "url" },
  { name: "admissionUrl", label: "Admission URL", type: "url" },
  { name: "verified", label: "Verified (visible to students)", type: "checkbox" },
];

function AdminUniversities() {
  const q = useQuery({
    queryKey: ["admin", "universities", "all"],
    queryFn: () => api.admin.universities.listAll({}, true),
  });
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<University | null>(null);
  const [open, setOpen] = useState(false);

  const save = useAdminMutation(
    (v: Partial<University>) =>
      editing ? api.admin.universities.update(editing._id, v) : api.admin.universities.create(v),
    editing ? "University updated" : "University added",
    () => setOpen(false),
  );
  const status = useAdminMutation(
    ({ id, s }: { id: string; s: string }) => api.admin.universities.setStatus(id, s),
    "Status updated — followers notified",
  );
  const verify = useAdminMutation(
    (id: string) => api.admin.universities.verify(id),
    "Marked verified",
  );
  const archive = useAdminMutation(
    (id: string) => api.admin.universities.archive(id),
    "University archived",
  );

  const rows = (q.data ?? []).filter(
    (u) =>
      (showArchived || !u.isArchived) &&
      (!search ||
        `${u.name} ${u.shortName} ${u.state}`.toLowerCase().includes(search.toLowerCase())),
  );
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <PageHeader
        eyebrow="Content management"
        title="Universities"
        description={`${rows.length} universities`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add university
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => {
              setShowArchived(e.target.checked);
              setPage(1);
            }}
          />{" "}
          Show archived
        </label>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <div className="card-surface overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>University</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Admission status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Verified on</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((u) => (
                <TableRow key={u._id} className={u.isArchived ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UniAvatar uni={u} className="h-9 w-9" />
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.type ? humanize(u.type) : "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {[u.city, u.state].filter(Boolean).join(", ")}
                  </TableCell>
                  <TableCell>
                    <select
                      className={`${selectClass} h-8 w-48 text-xs`}
                      value={u.admissionStatus}
                      onChange={(e) => status.mutate({ id: u._id, s: e.target.value })}
                    >
                      {ADMISSION_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="space-x-1">
                    {u.verified ? (
                      <Tag tone="success">Verified</Tag>
                    ) : (
                      <Tag tone="warning">Unverified</Tag>
                    )}
                    {u.isArchived && <Tag>Archived</Tag>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(u.lastVerifiedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Mark verified"
                      onClick={() => verify.mutate(u._id)}
                    >
                      <BadgeCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Edit"
                      onClick={() => {
                        setEditing(u);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!u.isArchived && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Archive"
                        onClick={() => confirm(`Archive ${u.name}?`) && archive.mutate(u._id)}
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
          total={rows.length}
          onPageChange={setPage}
        />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit university" : "Add university"}
        fields={FIELDS}
        initial={editing ?? { verified: false }}
        onSubmit={(v) => save.mutate(v)}
        busy={save.isPending}
      />
    </>
  );
}
