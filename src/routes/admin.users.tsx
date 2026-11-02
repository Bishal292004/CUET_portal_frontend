import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorBox, Loading, PageHeader, Tag, selectClass } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { RoleGate } from "@/components/layout/RoleGate";
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
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { seo } from "@/lib/seo";
import type { AdminUser, Role } from "@/lib/types";

export const Route = createFileRoute("/admin/users")({
  head: () => seo("User management", "Manage CUET PG Portal user roles and account status."),
  component: () => (
    <RoleGate roles={["admin"]}>
      <AdminUsers />
    </RoleGate>
  ),
});

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [verified, setVerified] = useState("");
  const limit = 20;

  const usersQuery = useQuery({
    queryKey: ["admin", "users", { page, limit, search, role, active, verified }],
    queryFn: () =>
      api.admin.users.list({
        page,
        limit,
        q: search.trim() || undefined,
        role: role || undefined,
        active: active || undefined,
        verified: verified || undefined,
      }),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { role?: Role; isActive?: boolean } }) =>
      api.admin.users.update(id, changes),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  const data = usersQuery.data;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Review accounts, assign roles, and manage account access."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search users by name or email"
            className="pl-9"
            placeholder="Search name or email"
            value={search}
            onChange={(event) => setFilter(setSearch, event.target.value)}
          />
        </div>
        <select
          aria-label="Filter by role"
          className={selectClass}
          value={role}
          onChange={(event) => setFilter(setRole, event.target.value)}
        >
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <select
          aria-label="Filter by account status"
          className={selectClass}
          value={active}
          onChange={(event) => setFilter(setActive, event.target.value)}
        >
          <option value="">All account statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          aria-label="Filter by email verification"
          className={selectClass}
          value={verified}
          onChange={(event) => setFilter(setVerified, event.target.value)}
        >
          <option value="">All verification statuses</option>
          <option value="true">Email verified</option>
          <option value="false">Email not verified</option>
        </select>
      </div>

      {usersQuery.isLoading ? (
        <Loading />
      ) : usersQuery.error ? (
        <ErrorBox error={usersQuery.error} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>Students: {data?.totals.student ?? 0}</span>
            <span>Editors: {data?.totals.editor ?? 0}</span>
            <span>Admins: {data?.totals.admin ?? 0}</span>
          </div>
          <div className="card-surface overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((account: AdminUser) => {
                  const isSelf = account._id === currentUser?.id;
                  return (
                    <TableRow key={account._id}>
                      <TableCell>
                        <p className="font-semibold">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{account.email}</p>
                      </TableCell>
                      <TableCell>
                        <select
                          aria-label={`Role for ${account.email}`}
                          className={`${selectClass} w-32`}
                          value={account.role}
                          disabled={isSelf || updateUser.isPending}
                          onChange={(event) => {
                            const nextRole = event.target.value as Role;
                            if (
                              nextRole !== account.role &&
                              window.confirm(`Change ${account.name}'s role to ${nextRole}?`)
                            ) {
                              updateUser.mutate({
                                id: account._id,
                                changes: { role: nextRole },
                              });
                            }
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        {isSelf && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Your role
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag tone={account.isActive ? "success" : "warning"}>
                            {account.isActive ? "Active" : "Inactive"}
                          </Tag>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf || updateUser.isPending}
                            aria-label={`${account.isActive ? "Deactivate" : "Activate"} ${account.email}`}
                            onClick={() => {
                              const isActive = !account.isActive;
                              if (
                                window.confirm(
                                  `${isActive ? "Activate" : "Deactivate"} ${account.name}'s account?`,
                                )
                              ) {
                                updateUser.mutate({ id: account._id, changes: { isActive } });
                              }
                            }}
                          >
                            {account.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tag tone={account.emailVerified ? "success" : "warning"}>
                          {account.emailVerified ? "Verified" : "Not verified"}
                        </Tag>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {fmtDate(account.lastLoginAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {fmtDate(account.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!data?.users.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No users match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {data && (
            <PaginationControls
              page={data.pagination.page}
              pageSize={data.pagination.limit}
              total={data.pagination.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </>
  );
}
