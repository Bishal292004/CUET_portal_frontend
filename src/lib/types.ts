// Mirrors models/constants.js and the Mongoose models in CUET_Portal_Backend.
export const ROLES = ["student", "editor", "admin"] as const;
export const ADMISSION_STATUS = ["NOT_STARTED", "OPEN", "MERIT_LIST_RELEASED", "CLOSED"] as const;
export const EVENT_TYPES = [
  "APPLICATION_OPEN",
  "APPLICATION_CLOSE",
  "MERIT_LIST",
  "COUNSELLING_ROUND",
  "DOCUMENT_VERIFICATION",
  "ADMISSION_LAST_DATE",
  "OTHER",
] as const;
export const UPDATE_TYPES = [
  "MERIT_LIST",
  "PROVISIONAL_LIST",
  "NOTICE",
  "DATE_CHANGE",
  "OTHER",
] as const;
export const CATEGORIES = ["GEN", "OBC", "SC", "ST", "EWS", "PWD"] as const;
export const UNIVERSITY_TYPES = ["CENTRAL", "STATE", "DEEMED", "PRIVATE", "OTHER"] as const;

export type Role = (typeof ROLES)[number];
export type AdmissionStatus = (typeof ADMISSION_STATUS)[number];
export type Category = (typeof CATEGORIES)[number];
export type ChanceLabel = "HIGH" | "MODERATE" | "LOW" | "UNLIKELY" | "NO_DATA";

// Refs may be populated objects or raw ids depending on the endpoint
export type Ref<T> = string | T;

export interface University {
  _id: string;
  name: string;
  shortName?: string | undefined;
  slug: string;
  state: string;
  city?: string | undefined;
  type?: (typeof UNIVERSITY_TYPES)[number] | undefined;
  websiteUrl?: string | undefined;
  admissionUrl?: string | undefined;
  admissionStatus: AdmissionStatus;
  statusUpdatedAt?: string | undefined;
  lastVerifiedAt?: string | undefined;
  verified?: boolean | undefined;
  isArchived?: boolean | undefined;
}

export interface Course {
  _id: string;
  name: string;
  slug: string;
  category?: string | undefined;
  cuetPaperCode?: string | undefined;
  isActive?: boolean | undefined;
}

export interface Programme {
  _id: string;
  university: Ref<University>;
  course: Ref<Course>;
  programmeName?: string | undefined;
  durationYears?: number | undefined;
  totalSeats?: number | undefined;
  seatsAvailable?: number | undefined;
  annualFee?: number | undefined;
  eligibility?: string | undefined;
  sourceUrl?: string | undefined;
  lastVerifiedAt?: string | undefined;
  verified?: boolean | undefined;
  isArchived?: boolean | undefined;
}

export interface Cutoff {
  _id: string;
  programme: Ref<Programme>;
  year: number;
  round: number;
  category: string;
  closingScore: number;
  sourceUrl?: string | undefined;
  verified?: boolean | undefined;
}

export interface EventItem {
  _id: string;
  university: Ref<University>;
  course?: Ref<Course> | undefined;
  type: (typeof EVENT_TYPES)[number];
  title: string;
  description?: string | undefined;
  startsAt: string;
  endsAt?: string | undefined;
  sourceUrl?: string | undefined;
  verified?: boolean | undefined;
}

export interface Update {
  _id: string;
  university: Ref<University>;
  course?: Ref<Course> | undefined;
  type: (typeof UPDATE_TYPES)[number];
  title: string;
  summary?: string | undefined;
  sourceUrl?: string | undefined;
  publishedAt: string;
  notificationsQueued?: boolean | undefined;
  origin?: "MANUAL" | "SCRAPER" | undefined;
}

export interface ScraperMonitor {
  _id: string;
  university: Ref<University>;
  url: string;
  isEnabled: boolean;
  intervalHours: number;
  lastCheckedAt?: string | undefined;
  lastStatus: "OK" | "ERROR";
  lastError?: string | undefined;
}

export interface ScraperDetection {
  _id: string;
  university: Ref<University>;
  monitor: Ref<ScraperMonitor>;
  previousText?: string | undefined;
  newText: string;
  suggestedTitle?: string | undefined;
  suggestedSummary?: string | undefined;
  sourceUrl?: string | undefined;
  status: "PENDING" | "APPROVING" | "APPROVED" | "DISMISSED";
  createdAt: string;
  reviewedAt?: string | undefined;
}

export interface Notification {
  _id: string;
  university?: Ref<University> | undefined;
  update?: string | undefined;
  title: string;
  message?: string | undefined;
  link?: string | undefined;
  readAt?: string | undefined;
  createdAt: string;
}

export interface CuetScore {
  course: Ref<Course>;
  score: number;
  isExpected?: boolean | undefined;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  category?: Category | undefined;
  preferredStates: string[];
  interestedCourses: Ref<Course>[];
  cuetYear?: number | undefined;
  cuetScores: CuetScore[];
  emailNotifications: boolean;
  emailVerified: boolean;
  createdAt?: string | undefined;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  category?: Category | undefined;
  lastLoginAt?: string | undefined;
  createdAt?: string | undefined;
}

export interface AuditLog {
  _id: string;
  user: { _id: string; name: string; email: string; role: Role } | string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export interface Chance {
  label: ChanceLabel;
  reason?: string | undefined;
  yourScore?: number | undefined;
  isExpected?: boolean | undefined;
  difference?: number | undefined;
  cutoff?: { closingScore: number; year: number; round: number; category: string } | undefined;
  fallbackToGeneral?: boolean | undefined;
}

export interface ChanceResult {
  programme: {
    id: string;
    programmeName?: string | undefined;
    durationYears?: number | undefined;
    totalSeats?: number | undefined;
    annualFee?: number | undefined;
    university: University;
    course: Course;
  };
  inPreferredState: boolean;
  chance: Chance;
}

export interface Recommendation extends ChanceResult {
  reasons?: string[] | undefined;
  score?: number | undefined;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
