import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RoleGate } from "@/components/layout/RoleGate";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: ({ location }) => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") throw redirect({ to: "/admin/universities" });
  },
  component: () => (
    <RoleGate roles={["editor", "admin"]}>
      <DashboardShell variant="admin">
        <Outlet />
      </DashboardShell>
    </RoleGate>
  ),
});
