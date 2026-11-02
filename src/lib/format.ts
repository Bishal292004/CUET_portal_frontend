import type { AdmissionStatus, ChanceLabel, Course, Ref, University } from "./types";

export const STATUS_LABEL: Record<AdmissionStatus, string> = {
  NOT_STARTED: "Not Started",
  OPEN: "Open",
  MERIT_LIST_RELEASED: "Merit List Released",
  CLOSED: "Closed",
};

export const CHANCE_LABEL: Record<ChanceLabel, string> = {
  HIGH: "High chance",
  MODERATE: "Moderate",
  LOW: "Low",
  UNLIKELY: "Unlikely",
  NO_DATA: "No data",
};

export const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

export const inr = (n?: number) => (n === undefined || n === null ? "—" : `₹${n.toLocaleString("en-IN")}`);

export const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  if (s < 172800) return "Yesterday";
  return `${Math.round(s / 86400)} days ago`;
}

export const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

export const uniOf = (r: Ref<University> | undefined) => (r && typeof r === "object" ? r : undefined);
export const courseOf = (r: Ref<Course> | undefined) => (r && typeof r === "object" ? r : undefined);
export const refId = (r: unknown) => (typeof r === "string" ? r : (r as { _id?: string; id?: string })?._id ?? (r as { id?: string })?.id ?? "");

export const initials = (u: Pick<University, "name" | "shortName">) =>
  u.shortName ?? u.name.split(" ").filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join("").slice(0, 4);
