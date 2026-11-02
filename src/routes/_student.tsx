import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RoleGate } from "@/components/layout/RoleGate";

export const Route = createFileRoute("/_student")({
  ssr: false,
  component: () => (
    <RoleGate roles={["student"]}>
      <DashboardShell variant="student">
        <Outlet />
      </DashboardShell>
    </RoleGate>
  ),
});
