import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBox, Loading, PageHeader, selectClass } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { RoleGate } from "@/components/layout/RoleGate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { humanize } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => seo("Audit logs", "Review administrative changes made in CUET PG Portal."),
  component: () => (
    <RoleGate roles={["admin"]}>
      <AuditLogs />
    </RoleGate>
  ),
});

function AuditLogs() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const limit = 20;

  const logsQuery = useQuery({
    queryKey: ["admin", "audit-logs", { page, limit, entity, action, from, to }],
    queryFn: () =>
      api.admin.auditLogs.list({
        page,
        limit,
        entity: entity.trim() || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
      }),
  });
  const resetPage = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };
  const dateTime = (value: string) =>
    Number.isNaN(new Date(value).getTime())
      ? "Unknown date"
      : new Date(value).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        });

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Audit logs"
        description="Read-only history of changes made by administrators and editors."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          aria-label="Filter by entity"
          className={selectClass}
          placeholder="Entity (e.g. Programme)"
          value={entity}
          onChange={(event) => resetPage(setEntity, event.target.value)}
        />
        <select
          aria-label="Filter by action"
          className={selectClass}
          value={action}
          onChange={(event) => resetPage(setAction, event.target.value)}
        >
          <option value="">All actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
        <input
          aria-label="From date"
          className={selectClass}
          type="date"
          value={from}
          onChange={(event) => resetPage(setFrom, event.target.value)}
        />
        <input
          aria-label="To date"
          className={selectClass}
          type="date"
          value={to}
          onChange={(event) => resetPage(setTo, event.target.value)}
        />
      </div>

      {logsQuery.isLoading ? (
        <Loading />
      ) : logsQuery.error ? (
        <ErrorBox error={logsQuery.error} />
      ) : (
        <>
          <div className="card-surface overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin/editor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data?.logs.map((log) => {
                  const actor = !log.user
                    ? "Deleted user"
                    : typeof log.user === "string"
                      ? log.user
                      : log.user.name;
                  const email = log.user && typeof log.user !== "string" ? log.user.email : "";
                  return (
                    <TableRow key={log._id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {dateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{actor}</p>
                        {email && <p className="text-xs text-muted-foreground">{email}</p>}
                      </TableCell>
                      <TableCell>{humanize(log.action)}</TableCell>
                      <TableCell>{humanize(log.entity)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                      <TableCell>
                        <details>
                          <summary className="cursor-pointer text-primary">View</summary>
                          <div className="mt-2 grid min-w-64 gap-2 text-xs">
                            {log.before !== undefined && (
                              <div>
                                <p className="mb-1 font-semibold">Before</p>
                                <pre className="max-h-48 overflow-auto rounded bg-muted p-2">
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after !== undefined && (
                              <div>
                                <p className="mb-1 font-semibold">After</p>
                                <pre className="max-h-48 overflow-auto rounded bg-muted p-2">
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!logsQuery.data?.logs.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No audit logs match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {logsQuery.data && (
            <PaginationControls
              page={logsQuery.data.pagination.page}
              pageSize={logsQuery.data.pagination.limit}
              total={logsQuery.data.pagination.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </>
  );
}
