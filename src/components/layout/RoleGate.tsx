import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Loading } from "@/components/common";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

/** Client-side gate (tokens live in localStorage). The backend enforces the same roles. */
export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (!roles.includes(user.role)) return <Navigate to={user.role === "student" ? "/dashboard" : "/admin/universities"} />;
  return <>{children}</>;
}
