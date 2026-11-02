import { Link } from "@tanstack/react-router";
import { GraduationCap, Inbox, Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CHANCE_LABEL, STATUS_LABEL, initials } from "@/lib/format";
import type { AdmissionStatus, ChanceLabel, University } from "@/lib/types";
import { onBackendStatus } from "@/lib/api";
import { Label } from "@/components/ui/label";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
        <GraduationCap className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-bold text-foreground">CUET PG</span>
          <span className="block text-[11px] text-muted-foreground">Counselling Assistant</span>
        </span>
      )}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const pill = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap";

const STATUS_TONE: Record<AdmissionStatus, string> = {
  OPEN: "bg-success-soft text-success",
  MERIT_LIST_RELEASED: "bg-warning-soft text-warning",
  NOT_STARTED: "bg-muted text-muted-foreground",
  CLOSED: "bg-destructive/10 text-destructive",
};
export function StatusBadge({ status }: { status: AdmissionStatus }) {
  return <span className={cn(pill, STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>;
}

const CHANCE_TONE: Record<ChanceLabel, string> = {
  HIGH: "bg-success-soft text-success",
  MODERATE: "bg-info-soft text-info",
  LOW: "bg-warning-soft text-warning",
  UNLIKELY: "bg-destructive/10 text-destructive",
  NO_DATA: "bg-muted text-muted-foreground",
};
export function ChanceBadge({ label }: { label: ChanceLabel }) {
  return <span className={cn(pill, CHANCE_TONE[label])}>{CHANCE_LABEL[label]}</span>;
}

export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "success" | "warning" }) {
  const t = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  }[tone];
  return <span className={cn(pill, "font-medium", t)}>{children}</span>;
}

export function UniAvatar({ uni, className }: { uni: Pick<University, "name" | "shortName">; className?: string }) {
  return (
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-xs font-bold text-primary", className)}>
      {initials(uni)}
    </span>
  );
}

export function StatCard({ icon, value, label, tone = "primary" }: { icon: ReactNode; value: ReactNode; label: string; tone?: "primary" | "success" | "warning" }) {
  const t = { primary: "bg-primary-soft text-primary", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning" }[tone];
  return (
    <div className="card-surface flex items-center gap-4 p-5">
      <span className={cn("grid h-11 w-11 place-items-center rounded-xl", t)}>{icon}</span>
      <div>
        <div className="text-2xl font-extrabold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center justify-center gap-2 p-12 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {error instanceof Error ? error.message : "Something went wrong."}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export function DemoBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const off = onBackendStatus(setOffline);
    return () => {
      off();
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="bg-warning-soft px-4 py-2 text-center text-xs font-medium text-warning">
      Backend not reachable — showing demo data. Start the API server to see live data.
    </div>
  );
}
