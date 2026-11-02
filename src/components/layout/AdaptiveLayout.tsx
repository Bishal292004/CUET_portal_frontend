import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardShell } from "./DashboardShell";
import { PublicLayout } from "./PublicLayout";

/** Student sidebar when a student is signed in, public navbar otherwise. */
export function AdaptiveLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "student") return <DashboardShell variant="student">{children}</DashboardShell>;
  return (
    <PublicLayout surface>
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">{children}</div>
    </PublicLayout>
  );
}
