import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, CalendarClock, ExternalLink, Heart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChanceBadge,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  StatCard,
  StatusBadge,
  UniAvatar,
} from "@/components/common";
import { api } from "@/lib/api";
import { daysUntil, fmtDate, humanize, timeAgo, uniOf } from "@/lib/format";
import { seo } from "@/lib/seo";
import type { ChanceResult, EventItem, University } from "@/lib/types";

export const Route = createFileRoute("/_student/dashboard")({
  head: () =>
    seo("Dashboard", "Your CUET PG counselling hub: matches, deadlines and merit list updates."),
  component: Dashboard,
});

function Dashboard() {
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.me.dashboard() });
  const notes = useQuery({
    queryKey: ["notifications", "latest"],
    queryFn: () => api.me.notifications.list(),
  });
  const allUnis = useQuery({
    queryKey: ["universities"],
    queryFn: () => api.universities.listAll(),
  });

  if (dash.isLoading) return <Loading />;
  if (dash.error) return <ErrorBox error={dash.error} />;
  const d = dash.data;
  const upcoming: EventItem[] = d.events?.upcoming ?? [];
  const top: ChanceResult[] = d.topMatches ?? [];
  const openCount = (allUnis.data ?? []).filter(
    (u: University) => u.admissionStatus === "OPEN",
  ).length;
  const firstName = d.student?.name?.split(" ")[0] ?? "student";

  return (
    <>
      <PageHeader
        eyebrow="Your counselling hub"
        title={`Good to see you, ${firstName}.`}
        description="Here's what needs your attention today."
        actions={
          <Button variant="outline" asChild>
            <Link to="/profile">Edit preferences</Link>
          </Button>
        }
      />
      {d.setup && !(d.setup.hasCourses && d.setup.hasCategory && d.setup.hasScores) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft p-4 text-sm">
          <span>
            Finish your profile — add{" "}
            {[
              !d.setup.hasCourses && "courses",
              !d.setup.hasCategory && "category",
              !d.setup.hasScores && "scores",
            ]
              .filter(Boolean)
              .join(", ")}{" "}
            to unlock chance estimates.
          </span>
          <Button size="sm" asChild>
            <Link to="/profile">Complete profile</Link>
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          value={openCount}
          label="Open universities"
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          value={upcoming.length}
          label="Upcoming deadlines"
        />
        <StatCard
          icon={<Bell className="h-5 w-5" />}
          value={d.unreadNotifications ?? 0}
          label="Unread updates"
          tone="warning"
        />
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          value={d.followingCount ?? 0}
          label="Saved universities"
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Your best matches</h2>
              <p className="text-sm text-muted-foreground">
                Based on your scores and last year's cutoffs.
              </p>
            </div>
            <Link
              to="/recommendations"
              className="flex items-center gap-1 text-sm font-medium text-primary"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 divide-y">
            {top.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">Add your scores to see matches.</p>
            )}
            {top.map((r) => (
              <Link
                key={r.programme.id}
                to="/programmes/$id"
                params={{ id: r.programme.id }}
                className="flex items-center gap-3 py-4"
              >
                <UniAvatar uni={r.programme.university} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.programme.university.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.programme.course.name} · {r.programme.totalSeats ?? "—"} seats
                  </p>
                </div>
                <ChanceBadge label={r.chance.label} />
              </Link>
            ))}
          </div>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Latest updates</h2>
              <p className="text-sm text-muted-foreground">
                Changes across universities you're tracking.
              </p>
            </div>
            <Link to="/notifications" className="text-sm font-medium text-primary">
              See all
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {(notes.data?.notifications ?? []).slice(0, 3).map((n) => (
              <div
                key={n._id}
                className={`flex gap-3 rounded-xl p-3 ${n.readAt ? "" : "bg-surface"}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Bell className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
            {!notes.data?.notifications.length && (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-xl font-bold">Upcoming dates</h2>
          <div className="mt-4 divide-y">
            {upcoming.length === 0 && <EmptyState title="No upcoming dates" />}
            {upcoming.slice(0, 5).map((e) => {
              const u = uniOf(e.university);
              const days = daysUntil(e.startsAt);
              return (
                <div key={e._id} className="flex items-center gap-3 py-3">
                  <div className="w-14 text-center">
                    <p className="text-lg font-extrabold text-primary">{days}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">days</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {u?.name} · {humanize(e.type)} · {fmtDate(e.startsAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card-surface p-6">
          <h2 className="text-xl font-bold">Admissions happening now</h2>
          <div className="mt-4 divide-y">
            {(d.activeUniversities ?? []).slice(0, 5).map((u: University) => (
              <Link
                key={u._id}
                to="/universities/$id"
                params={{ id: u._id }}
                className="flex items-center gap-3 py-3"
              >
                <UniAvatar uni={u} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.city}, {u.state}
                  </p>
                </div>
                <StatusBadge status={u.admissionStatus} />
              </Link>
            ))}
            {!d.activeUniversities?.length && (
              <p className="text-sm text-muted-foreground">None for your courses right now.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card-surface mt-6 flex items-start justify-between gap-4 p-6">
        <div>
          <h3 className="font-bold">Always verify before applying</h3>
          <p className="text-sm text-muted-foreground">
            CUET PG Counselling Assistant helps you discover and track information. Applications and
            payments happen on official university portals.
          </p>
        </div>
        <ExternalLink className="h-6 w-6 shrink-0 text-primary" />
      </div>
    </>
  );
}
