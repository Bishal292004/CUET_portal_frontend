/**
 * Centralised API service for CUET_Portal_Backend (Express + MongoDB).
 * Base URL: VITE_API_URL (default http://localhost:5000/api).
 * Every backend reply looks like { success, message?, data }.
 * If the backend can't be reached (or the user is in a demo session),
 * calls transparently fall back to an in-memory mock store so every page works.
 */
import {
  mockCourses,
  mockCutoffs,
  mockEvents,
  mockFollowing,
  mockNotifications,
  mockProgrammes,
  mockUniversities,
  mockUpdates,
  mockUser,
} from "./mock-data";
import { estimateChance, recommendFrom } from "./chance";
import type {
  AdminUser,
  AuditLog,
  ChanceResult,
  Course,
  Cutoff,
  EventItem,
  Notification,
  Pagination,
  Programme,
  Recommendation,
  University,
  Update,
  ScraperDetection,
  ScraperMonitor,
  User,
} from "./types";

export const API_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:5000/api";

export const TOKEN_KEY = "cuet_token";
export const DEMO_TOKEN = "demo-token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
class NetworkError extends Error {}

let backendOffline = false;
const listeners = new Set<(offline: boolean) => void>();
export const onBackendStatus = (fn: (offline: boolean) => void) => {
  listeners.add(fn);
  fn(backendOffline);
  return () => listeners.delete(fn);
};
const setOffline = (v: boolean) => {
  if (backendOffline === v) return;
  backendOffline = v;
  listeners.forEach((l) => l(v));
};

const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY));
const isDemo = () => getToken() === DEMO_TOKEN;

type Opts = { method?: string; body?: unknown; query?: Record<string, unknown> };

async function request<T = any>(
  path: string,
  { method = "GET", body, query }: Opts = {},
): Promise<T> {
  const url = new URL(API_URL.replace(/\/$/, "") + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const token = getToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token && token !== DEMO_TOKEN ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError("Backend unreachable");
  } finally {
    clearTimeout(timer);
  }
  setOffline(false);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || `Request failed (${res.status})`, res.status);
  }
  return (json.data ?? json) as T;
}

async function fetchAllPages<T, K extends string>(
  path: string,
  key: K,
  query: Record<string, unknown> = {},
): Promise<T[]> {
  type Page = { pagination: Pagination } & Record<K, T[]>;
  const fetchPage = (page: number) =>
    request<Page>(path, { query: { ...query, page, limit: 100 } });

  const first = await fetchPage(1);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, index) =>
      fetchPage(index + 2),
    ),
  );
  return [first, ...remaining].flatMap((response) => response[key]);
}

async function withFallback<T>(real: () => Promise<T>, mock: () => T | Promise<T>): Promise<T> {
  if (isDemo() || backendOffline) return mock();
  try {
    return await real();
  } catch (e) {
    if (e instanceof NetworkError) {
      setOffline(true);
      return mock();
    }
    throw e;
  }
}

/* ---------------- in-memory mock store ---------------- */
const db = {
  universities: [...mockUniversities],
  courses: [...mockCourses],
  programmes: [...mockProgrammes],
  cutoffs: [...mockCutoffs],
  events: [...mockEvents],
  updates: [...mockUpdates],
  notifications: [...mockNotifications],
  following: [...mockFollowing],
  user: { ...mockUser } as User,
};
const id = () => Math.random().toString(36).slice(2, 10);
const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));
const uniById = (uid: unknown) => db.universities.find((u) => u._id === uid || u.slug === uid);
const courseById = (cid: unknown) => db.courses.find((c) => c._id === cid);
const populateProgramme = (p: Programme): Programme => ({
  ...p,
  university: uniById(typeof p.university === "string" ? p.university : p.university._id)!,
  course: courseById(typeof p.course === "string" ? p.course : p.course._id)!,
});
const refId = (r: unknown) => (typeof r === "string" ? r : (r as { _id: string })?._id);
const populateEvent = <T extends EventItem | Update>(e: T): T => ({
  ...e,
  university: uniById(refId(e.university)) ?? e.university,
  course: e.course ? (courseById(refId(e.course)) ?? e.course) : undefined,
});
const notFound = (what: string) => {
  throw new ApiError(`${what} not found.`, 404);
};

function mockChanceResults(courseIds?: string[]): ChanceResult[] {
  const u = db.user;
  const targets = courseIds?.length ? courseIds : u.interestedCourses.map(refId);
  const cat = u.category ?? "GEN";
  const preferred = new Set(u.preferredStates);
  return db.programmes
    .filter((p) => targets.includes(refId(p.course)) && !p.isArchived)
    .map((raw) => {
      const p = populateProgramme(raw);
      const mine = u.cuetScores.find((s) => refId(s.course) === refId(p.course));
      const cutoffs = db.cutoffs.filter((c) => c.programme === p._id);
      const own = cutoffs.filter((c) => c.category === cat);
      const pool = own.length ? own : cutoffs.filter((c) => c.category === "GEN");
      const cutoff = [...pool].sort((a, b) => b.year - a.year || a.round - b.round)[0];
      const uni = p.university as University;
      return {
        programme: {
          id: p._id,
          programmeName: p.programmeName,
          durationYears: p.durationYears,
          totalSeats: p.totalSeats,
          annualFee: p.annualFee,
          university: uni,
          course: p.course as Course,
        },
        inPreferredState: preferred.has(uni.state),
        chance: estimateChance({
          score: mine?.score,
          isExpected: mine?.isExpected,
          cutoff,
          studentCategory: cat,
        }),
      };
    });
}

/* ---------------- public ---------------- */
export type UniversityFilters = {
  q?: string;
  state?: string;
  status?: string;
  page?: number;
  limit?: number;
};
export type ProgrammeFilters = {
  courseId?: string;
  universityId?: string;
  state?: string;
  status?: string;
  maxFee?: number | string;
  minSeats?: number | string;
  sort?: string;
  page?: number;
  limit?: number;
};

export const api = {
  health: () => request("/health"),

  universities: {
    list: (f: UniversityFilters = {}) =>
      withFallback(
        () =>
          request<{ universities: University[] }>("/universities", {
            query: { limit: 100, ...f },
          }).then((d) => d.universities),
        () => {
          const q = f.q?.toLowerCase() ?? "";
          return delay(
            db.universities.filter(
              (u) =>
                u.verified !== false &&
                !u.isArchived &&
                (!q || `${u.name} ${u.shortName} ${u.city} ${u.state}`.toLowerCase().includes(q)) &&
                (!f.state || u.state === f.state) &&
                (!f.status || u.admissionStatus === f.status),
            ),
          );
        },
      ),
    listAll: (f: UniversityFilters = {}) =>
      withFallback(
        () => fetchAllPages<University, "universities">("/universities", "universities", f),
        () => {
          const q = f.q?.toLowerCase() ?? "";
          return delay(
            db.universities.filter(
              (u) =>
                u.verified !== false &&
                !u.isArchived &&
                (!q || `${u.name} ${u.shortName} ${u.city} ${u.state}`.toLowerCase().includes(q)) &&
                (!f.state || u.state === f.state) &&
                (!f.status || u.admissionStatus === f.status),
            ),
          );
        },
      ),
    get: (uid: string) =>
      withFallback(
        () => request<{ university: University }>(`/universities/${uid}`).then((d) => d.university),
        () => delay(uniById(uid) ?? notFound("University")),
      ),
    events: (uid: string) =>
      withFallback(
        () => request<{ events: EventItem[] }>(`/universities/${uid}/events`).then((d) => d.events),
        () =>
          delay(
            db.events.filter((e) => refId(e.university) === uniById(uid)?._id).map(populateEvent),
          ),
      ),
    updates: (uid: string) =>
      withFallback(
        () => request<{ updates: Update[] }>(`/universities/${uid}/updates`).then((d) => d.updates),
        () =>
          delay(
            db.updates.filter((e) => refId(e.university) === uniById(uid)?._id).map(populateEvent),
          ),
      ),
    updatesAll: (uid: string) =>
      withFallback(
        () => fetchAllPages<Update, "updates">(`/universities/${uid}/updates`, "updates"),
        () =>
          delay(
            db.updates.filter((e) => refId(e.university) === uniById(uid)?._id).map(populateEvent),
          ),
      ),
  },

  courses: {
    list: () =>
      withFallback(
        () => request<{ courses: Course[] }>("/courses").then((d) => d.courses),
        () => delay(db.courses.filter((c) => c.isActive !== false)),
      ),
    listAll: () =>
      withFallback(
        () => fetchAllPages<Course, "courses">("/courses", "courses"),
        () => delay(db.courses.filter((c) => c.isActive !== false)),
      ),
  },

  programmes: {
    list: (f: ProgrammeFilters = {}) =>
      withFallback(
        () =>
          request<{ programmes: Programme[] }>("/programmes", { query: { limit: 100, ...f } }).then(
            (d) => d.programmes,
          ),
        () => {
          let list = db.programmes.filter((p) => !p.isArchived).map(populateProgramme);
          list = list.filter((p) => {
            const uni = p.university as University;
            return (
              (!f.courseId || refId(p.course) === f.courseId) &&
              (!f.universityId || uni._id === f.universityId) &&
              (!f.state || uni.state === f.state) &&
              (!f.status || uni.admissionStatus === f.status) &&
              (!f.maxFee || (p.annualFee ?? 0) <= Number(f.maxFee)) &&
              (!f.minSeats || (p.totalSeats ?? 0) >= Number(f.minSeats))
            );
          });
          if (f.sort === "fee_asc") list.sort((a, b) => (a.annualFee ?? 0) - (b.annualFee ?? 0));
          if (f.sort === "fee_desc") list.sort((a, b) => (b.annualFee ?? 0) - (a.annualFee ?? 0));
          if (f.sort === "seats_desc")
            list.sort((a, b) => (b.totalSeats ?? 0) - (a.totalSeats ?? 0));
          return delay(list);
        },
      ),
    listAll: (f: ProgrammeFilters = {}) =>
      withFallback(
        () => fetchAllPages<Programme, "programmes">("/programmes", "programmes", f),
        () => api.programmes.list(f),
      ),
    get: (pid: string) =>
      withFallback(
        () => request<{ programme: Programme }>(`/programmes/${pid}`).then((d) => d.programme),
        () => {
          const programme = db.programmes.find((p) => p._id === pid && !p.isArchived);
          return delay(programme ? populateProgramme(programme) : notFound("Programme"));
        },
      ),
    cutoffs: (pid: string, q: { category?: string; year?: number } = {}) =>
      withFallback(
        () =>
          request<{ cutoffs: Cutoff[] }>(`/programmes/${pid}/cutoffs`, { query: q }).then(
            (d) => d.cutoffs,
          ),
        () =>
          delay(
            db.cutoffs.filter(
              (c) =>
                c.programme === pid &&
                (!q.category || c.category === q.category) &&
                (!q.year || c.year === q.year),
            ),
          ),
      ),
  },

  /* ---------------- auth ---------------- */
  auth: {
    register: (b: { name: string; email: string; password: string }) =>
      withFallback(
        () =>
          request<{ emailSent: boolean; user: Partial<User> }>("/auth/register", {
            method: "POST",
            body: b,
          }),
        () =>
          delay({
            emailSent: true,
            user: { name: b.name, email: b.email, role: "student" as const },
          }),
      ),
    login: (b: { email: string; password: string }) =>
      withFallback(
        () =>
          request<{ token: string; user: Pick<User, "id" | "name" | "email" | "role"> }>(
            "/auth/login",
            { method: "POST", body: b },
          ),
        () => {
          const role = b.email.startsWith("admin")
            ? "admin"
            : b.email.startsWith("editor")
              ? "editor"
              : "student";
          const name =
            role === "student"
              ? db.user.name
              : role === "admin"
                ? "Portal Admin"
                : "Content Editor";
          db.user = { ...db.user, email: b.email, role, name };
          return delay({ token: DEMO_TOKEN, user: { id: db.user.id, name, email: b.email, role } });
        },
      ),
    verifyEmail: (b: { email: string; otp: string }) =>
      withFallback(
        () => request("/auth/verify-email", { method: "POST", body: b }),
        () => delay({ verified: true }),
      ),
    resendVerification: (email: string) =>
      withFallback(
        () => request("/auth/resend-verification", { method: "POST", body: { email } }),
        () => delay({}),
      ),
    forgotPassword: (email: string) =>
      withFallback(
        () => request("/auth/forgot-password", { method: "POST", body: { email } }),
        () => delay({}),
      ),
    resetPassword: (b: { email: string; otp: string; newPassword: string }) =>
      withFallback(
        () => request("/auth/reset-password", { method: "POST", body: b }),
        () => delay({}),
      ),
  },

  /* ---------------- signed-in student (/api/me) ---------------- */
  me: {
    get: () =>
      withFallback(
        () => request<{ user: User }>("/me").then((d) => d.user),
        () => delay(db.user),
      ),
    update: (
      b: Partial<Pick<User, "name" | "category" | "preferredStates" | "emailNotifications">>,
    ) =>
      withFallback(
        () => request<{ user: User }>("/me", { method: "PATCH", body: b }).then((d) => d.user),
        () => {
          db.user = { ...db.user, ...b };
          return delay(db.user);
        },
      ),
    setCourses: (courseIds: string[]) =>
      withFallback(
        () =>
          request<{ user: User }>("/me/courses", { method: "PUT", body: { courseIds } }).then(
            (d) => d.user,
          ),
        () => {
          db.user.interestedCourses = courseIds.map((c) => courseById(c)!).filter(Boolean);
          return delay(db.user);
        },
      ),
    setScores: (b: {
      cuetYear?: number;
      scores: { courseId: string; score: number; isExpected?: boolean }[];
    }) =>
      withFallback(
        () => request<{ user: User }>("/me/scores", { method: "PUT", body: b }).then((d) => d.user),
        () => {
          db.user.cuetYear = b.cuetYear ?? db.user.cuetYear;
          db.user.cuetScores = b.scores.map((s) => ({
            course: courseById(s.courseId)!,
            score: s.score,
            isExpected: s.isExpected,
          }));
          return delay(db.user);
        },
      ),
    changePassword: (b: { currentPassword: string; newPassword: string }) =>
      withFallback(
        () => request("/me/password", { method: "PATCH", body: b }),
        () => delay({}),
      ),
    chances: (courseId?: string) =>
      withFallback(
        () =>
          request<{ results: ChanceResult[] }>("/me/chances", { query: { courseId } }).then(
            (d) => d.results,
          ),
        () => delay(mockChanceResults(courseId ? [courseId] : undefined)),
      ),
    dashboard: () =>
      withFallback(
        () => request<any>("/me/dashboard"),
        () => {
          const results = mockChanceResults();
          const now = Date.now();
          const unis = new Map(
            results.map((r) => [r.programme.university._id, r.programme.university]),
          );
          return delay({
            student: { name: db.user.name, category: db.user.category ?? null },
            setup: {
              hasCourses: db.user.interestedCourses.length > 0,
              hasCategory: !!db.user.category,
              hasScores: db.user.cuetScores.length > 0,
            },
            stats: { universities: unis.size, programmes: results.length },
            topMatches: results.filter((r) => r.chance.label !== "NO_DATA").slice(0, 5),
            activeUniversities: [...unis.values()].filter(
              (u) => u.admissionStatus === "OPEN" || u.admissionStatus === "MERIT_LIST_RELEASED",
            ),
            events: {
              upcoming: db.events
                .filter((e) => +new Date(e.startsAt) >= now)
                .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
                .map(populateEvent),
              recent: db.events.filter((e) => +new Date(e.startsAt) < now).map(populateEvent),
            },
            unreadNotifications: db.notifications.filter((n) => !n.readAt).length,
            followingCount: db.following.length,
          });
        },
      ),
    recommendations: (q: { courseId?: string; related?: boolean; limit?: number } = {}) =>
      withFallback(
        () =>
          request<{ recommendations: Recommendation[] }>("/me/recommendations", { query: q }).then(
            (d) => d.recommendations,
          ),
        () =>
          delay(
            recommendFrom(
              mockChanceResults(q.courseId ? [q.courseId] : undefined),
              new Set(db.following),
            ).slice(0, q.limit ?? 10),
          ),
      ),
    subscriptions: {
      list: () =>
        withFallback(
          () =>
            request<{ following: { followedAt: string; university: University }[] }>(
              "/me/subscriptions",
            ).then((d) => d.following),
          () =>
            delay(
              db.following.map((f) => ({
                followedAt: new Date().toISOString(),
                university: uniById(f)!,
              })),
            ),
        ),
      follow: (universityId: string) =>
        withFallback(
          () => request("/me/subscriptions", { method: "POST", body: { universityId } }),
          () => {
            if (!db.following.includes(universityId)) db.following.unshift(universityId);
            return delay({});
          },
        ),
      unfollow: (universityId: string) =>
        withFallback(
          () => request(`/me/subscriptions/${universityId}`, { method: "DELETE" }),
          () => {
            db.following = db.following.filter((f) => f !== universityId);
            return delay({});
          },
        ),
    },
    notifications: {
      list: (q: { unread?: boolean; page?: number } = {}) =>
        withFallback(
          () =>
            request<{
              notifications: Notification[];
              unreadCount: number;
              pagination: Pagination;
            }>("/me/notifications", {
              query: { unread: q.unread ? "true" : undefined, page: q.page, limit: 50 },
            }),
          () => {
            const filtered = db.notifications.filter((n) => !q.unread || !n.readAt);
            const page = q.page ?? 1;
            const limit = 50;
            return delay({
              notifications: filtered
                .slice((page - 1) * limit, page * limit)
                .map((n) => ({ ...n, university: uniById(refId(n.university)) ?? n.university })),
              unreadCount: db.notifications.filter((n) => !n.readAt).length,
              pagination: {
                page,
                limit,
                total: filtered.length,
                totalPages: Math.ceil(filtered.length / limit),
              },
            });
          },
        ),
      unreadCount: () =>
        withFallback(
          () =>
            request<{ unreadCount: number }>("/me/notifications/unread-count").then(
              (d) => d.unreadCount,
            ),
          () => delay(db.notifications.filter((n) => !n.readAt).length),
        ),
      markRead: (nid: string) =>
        withFallback(
          () => request(`/me/notifications/${nid}/read`, { method: "PATCH" }),
          () => {
            db.notifications = db.notifications.map((n) =>
              n._id === nid ? { ...n, readAt: new Date().toISOString() } : n,
            );
            return delay({});
          },
        ),
      markAllRead: () =>
        withFallback(
          () => request("/me/notifications/read-all", { method: "PATCH" }),
          () => {
            db.notifications = db.notifications.map((n) => ({
              ...n,
              readAt: n.readAt ?? new Date().toISOString(),
            }));
            return delay({});
          },
        ),
    },
  },

  /* ---------------- editor / admin (/api/admin) ---------------- */
  admin: {
    scraper: {
      monitors: () =>
        request<{ monitors: ScraperMonitor[] }>("/admin/scraper/monitors").then((d) => d.monitors),
      createDemoMonitor: (universityId: string) =>
        request<{ monitor: ScraperMonitor }>("/admin/scraper/monitors/demo-university", {
          method: "POST",
          body: { universityId },
        }).then((d) => d.monitor),
      scan: (monitorId: string) =>
        request<{ detectionsCreated: number; skipped?: boolean }>(
          `/admin/scraper/monitors/${monitorId}/scan`,
          { method: "POST" },
        ),
      detections: () =>
        request<{ detections: ScraperDetection[] }>("/admin/scraper/detections").then(
          (d) => d.detections,
        ),
      approveDetection: (detectionId: string) =>
        request(`/admin/scraper/detections/${detectionId}/approve`, { method: "POST" }),
      dismissDetection: (detectionId: string) =>
        request(`/admin/scraper/detections/${detectionId}/dismiss`, { method: "POST" }),
    },
    users: {
      list: (
        query: {
          page?: number;
          limit?: number;
          q?: string;
          role?: string;
          active?: string;
          verified?: string;
        } = {},
      ) =>
        request<{
          users: AdminUser[];
          totals: Record<string, number>;
          pagination: Pagination;
        }>("/admin/users", { query }),
      update: (userId: string, changes: { role?: AdminUser["role"]; isActive?: boolean }) =>
        request<{ user: AdminUser }>(`/admin/users/${userId}`, {
          method: "PATCH",
          body: changes,
        }).then((data) => data.user),
    },
    auditLogs: {
      list: (
        query: {
          page?: number;
          limit?: number;
          entity?: string;
          action?: string;
          from?: string;
          to?: string;
        } = {},
      ) => request<{ logs: AuditLog[]; pagination: Pagination }>("/admin/audit-logs", { query }),
    },
    universities: {
      list: (q: { q?: string } = {}) =>
        withFallback(
          () =>
            request<{ universities: University[] }>("/admin/universities", {
              query: { limit: 100, ...q },
            }).then((d) => d.universities),
          () => delay(db.universities),
        ),
      listAll: (q: { q?: string } = {}, includeArchived = false) =>
        withFallback(
          async () => {
            const active = await fetchAllPages<University, "universities">(
              "/admin/universities",
              "universities",
              q,
            );
            if (!includeArchived) return active;
            const archived = await fetchAllPages<University, "universities">(
              "/admin/universities",
              "universities",
              { ...q, archived: "true" },
            );
            return [...active, ...archived];
          },
          () => delay(db.universities),
        ),
      create: (b: Partial<University>) =>
        withFallback(
          () =>
            request<{ university: University }>("/admin/universities", {
              method: "POST",
              body: b,
            }).then((d) => d.university),
          () => {
            const doc = {
              _id: id(),
              slug: (b.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              admissionStatus: "NOT_STARTED",
              ...b,
            } as University;
            db.universities.unshift(doc);
            return delay(doc);
          },
        ),
      update: (uid: string, b: Partial<University>) =>
        withFallback(
          () =>
            request<{ university: University }>(`/admin/universities/${uid}`, {
              method: "PATCH",
              body: b,
            }).then((d) => d.university),
          () => {
            db.universities = db.universities.map((u) => (u._id === uid ? { ...u, ...b } : u));
            return delay(uniById(uid)!);
          },
        ),
      setStatus: (uid: string, status: string) =>
        withFallback(
          () => request(`/admin/universities/${uid}/status`, { method: "PATCH", body: { status } }),
          () => {
            db.universities = db.universities.map((u) =>
              u._id === uid
                ? {
                    ...u,
                    admissionStatus: status as University["admissionStatus"],
                    statusUpdatedAt: new Date().toISOString(),
                  }
                : u,
            );
            return delay({});
          },
        ),
      verify: (uid: string) =>
        withFallback(
          () => request(`/admin/universities/${uid}/verify`, { method: "POST" }),
          () => {
            db.universities = db.universities.map((u) =>
              u._id === uid
                ? { ...u, verified: true, lastVerifiedAt: new Date().toISOString() }
                : u,
            );
            return delay({});
          },
        ),
      archive: (uid: string) =>
        withFallback(
          () => request(`/admin/universities/${uid}`, { method: "DELETE" }),
          () => {
            db.universities = db.universities.map((u) =>
              u._id === uid ? { ...u, isArchived: true } : u,
            );
            return delay({});
          },
        ),
      updates: (uid: string) =>
        withFallback(
          () =>
            request<{ updates: Update[] }>(`/admin/universities/${uid}/updates`).then(
              (d) => d.updates,
            ),
          () => delay(db.updates.filter((x) => refId(x.university) === uid).map(populateEvent)),
        ),
      updatesAll: (uid: string) =>
        withFallback(
          () => fetchAllPages<Update, "updates">(`/admin/universities/${uid}/updates`, "updates"),
          () => delay(db.updates.filter((x) => refId(x.university) === uid).map(populateEvent)),
        ),
      createUpdate: (uid: string, b: Partial<Update> & { courseId?: string }) =>
        withFallback(
          () => request(`/admin/universities/${uid}/updates`, { method: "POST", body: b }),
          () => {
            const { courseId, ...rest } = b;
            db.updates.unshift({
              _id: id(),
              university: uid,
              course: courseId,
              publishedAt: new Date().toISOString(),
              origin: "MANUAL",
              notificationsQueued: true,
              ...rest,
            } as Update);
            return delay({});
          },
        ),
      events: (uid: string) =>
        withFallback(
          () =>
            request<{ events: EventItem[] }>(`/admin/universities/${uid}/events`).then(
              (d) => d.events,
            ),
          () => delay(db.events.filter((x) => refId(x.university) === uid).map(populateEvent)),
        ),
      eventsAll: (uid: string) =>
        withFallback(
          () => fetchAllPages<EventItem, "events">(`/admin/universities/${uid}/events`, "events"),
          () => delay(db.events.filter((x) => refId(x.university) === uid).map(populateEvent)),
        ),
      createEvent: (uid: string, b: Partial<EventItem> & { courseId?: string }) =>
        withFallback(
          () => request(`/admin/universities/${uid}/events`, { method: "POST", body: b }),
          () => {
            const { courseId, ...rest } = b;
            db.events.unshift({
              _id: id(),
              university: uid,
              course: courseId,
              ...rest,
            } as EventItem);
            return delay({});
          },
        ),
    },
    updates: {
      patch: (uid: string, b: Partial<Update>) =>
        withFallback(
          () => request(`/admin/updates/${uid}`, { method: "PATCH", body: b }),
          () => {
            db.updates = db.updates.map((x) => (x._id === uid ? { ...x, ...b } : x));
            return delay({});
          },
        ),
      remove: (uid: string) =>
        withFallback(
          () => request(`/admin/updates/${uid}`, { method: "DELETE" }),
          () => {
            db.updates = db.updates.filter((x) => x._id !== uid);
            return delay({});
          },
        ),
      notify: (uid: string) =>
        withFallback(
          () => request(`/admin/updates/${uid}/notify`, { method: "POST" }),
          () => delay({}),
        ),
    },
    events: {
      patch: (eid: string, b: Partial<EventItem>) =>
        withFallback(
          () => request(`/admin/events/${eid}`, { method: "PATCH", body: b }),
          () => {
            db.events = db.events.map((x) => (x._id === eid ? { ...x, ...b } : x));
            return delay({});
          },
        ),
      remove: (eid: string) =>
        withFallback(
          () => request(`/admin/events/${eid}`, { method: "DELETE" }),
          () => {
            db.events = db.events.filter((x) => x._id !== eid);
            return delay({});
          },
        ),
    },
    courses: {
      list: () =>
        withFallback(
          () =>
            request<{ courses: Course[] }>("/admin/courses", { query: { limit: 100 } }).then(
              (d) => d.courses,
            ),
          () => delay(db.courses),
        ),
      listAll: (includeArchived = false) =>
        withFallback(
          async () => {
            const active = await fetchAllPages<Course, "courses">("/admin/courses", "courses");
            if (!includeArchived) return active;
            const inactive = await fetchAllPages<Course, "courses">("/admin/courses", "courses", {
              archived: "true",
            });
            return [...active, ...inactive];
          },
          () => delay(db.courses),
        ),
      create: (b: Partial<Course>) =>
        withFallback(
          () => request("/admin/courses", { method: "POST", body: b }),
          () => {
            db.courses.unshift({
              _id: id(),
              slug: (b.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              isActive: true,
              ...b,
            } as Course);
            return delay({});
          },
        ),
      update: (cid: string, b: Partial<Course>) =>
        withFallback(
          () => request(`/admin/courses/${cid}`, { method: "PATCH", body: b }),
          () => {
            db.courses = db.courses.map((c) => (c._id === cid ? { ...c, ...b } : c));
            return delay({});
          },
        ),
      archive: (cid: string) =>
        withFallback(
          () => request(`/admin/courses/${cid}`, { method: "DELETE" }),
          () => {
            db.courses = db.courses.map((c) => (c._id === cid ? { ...c, isActive: false } : c));
            return delay({});
          },
        ),
    },
    programmes: {
      list: () =>
        withFallback(
          () =>
            request<{ programmes: Programme[] }>("/admin/programmes", {
              query: { limit: 100 },
            }).then((d) => d.programmes),
          () => delay(db.programmes.map(populateProgramme)),
        ),
      listAll: () =>
        withFallback(
          () => fetchAllPages<Programme, "programmes">("/admin/programmes", "programmes"),
          () => delay(db.programmes.map(populateProgramme)),
        ),
      create: (b: Record<string, unknown>) =>
        withFallback(
          () => request("/admin/programmes", { method: "POST", body: b }),
          () => {
            const { universityId, courseId, ...rest } = b;
            db.programmes.unshift({
              _id: id(),
              university: universityId,
              course: courseId,
              verified: false,
              isArchived: false,
              ...rest,
            } as unknown as Programme);
            return delay({});
          },
        ),
      update: (pid: string, b: Record<string, unknown>) =>
        withFallback(
          () => request(`/admin/programmes/${pid}`, { method: "PATCH", body: b }),
          () => {
            db.programmes = db.programmes.map((p) =>
              p._id === pid ? ({ ...p, ...b } as Programme) : p,
            );
            return delay({});
          },
        ),
      verify: (pid: string) =>
        withFallback(
          () => request(`/admin/programmes/${pid}/verify`, { method: "POST" }),
          () => {
            db.programmes = db.programmes.map((p) =>
              p._id === pid ? { ...p, verified: true } : p,
            );
            return delay({});
          },
        ),
      archive: (pid: string) =>
        withFallback(
          () => request(`/admin/programmes/${pid}`, { method: "DELETE" }),
          () => {
            db.programmes = db.programmes.map((p) =>
              p._id === pid ? { ...p, isArchived: true } : p,
            );
            return delay({});
          },
        ),
      cutoffs: (pid: string) =>
        withFallback(
          () =>
            request<{ cutoffs: Cutoff[] }>(`/admin/programmes/${pid}/cutoffs`).then(
              (d) => d.cutoffs,
            ),
          () => delay(db.cutoffs.filter((c) => c.programme === pid)),
        ),
      createCutoff: (pid: string, b: Partial<Cutoff>) =>
        withFallback(
          () => request(`/admin/programmes/${pid}/cutoffs`, { method: "POST", body: b }),
          () => {
            if (
              db.cutoffs.some(
                (c) =>
                  c.programme === pid &&
                  c.year === b.year &&
                  c.round === b.round &&
                  c.category === b.category,
              )
            ) {
              throw new ApiError("A cutoff for this year, round and category already exists.", 409);
            }
            db.cutoffs.unshift({ _id: id(), programme: pid, ...b } as Cutoff);
            return delay({});
          },
        ),
    },
    cutoffs: {
      update: (cid: string, b: Partial<Cutoff>) =>
        withFallback(
          () => request(`/admin/cutoffs/${cid}`, { method: "PATCH", body: b }),
          () => {
            db.cutoffs = db.cutoffs.map((c) => (c._id === cid ? { ...c, ...b } : c));
            return delay({});
          },
        ),
      remove: (cid: string) =>
        withFallback(
          () => request(`/admin/cutoffs/${cid}`, { method: "DELETE" }),
          () => {
            db.cutoffs = db.cutoffs.filter((c) => c._id !== cid);
            return delay({});
          },
        ),
    },
  },
};

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong.";
