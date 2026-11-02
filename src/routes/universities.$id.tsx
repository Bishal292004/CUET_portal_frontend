import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorBox, Loading, StatusBadge, Tag, UniAvatar } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { api } from "@/lib/api";
import { useFollow } from "@/lib/hooks";
import { courseOf, fmtDate, humanize, inr, timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/universities/$id")({
  head: () =>
    seo(
      "University details",
      "Courses, admission process, events and announcements for this CUET PG university.",
    ),
  component: UniversityDetails,
});

function UniversityDetails() {
  const { id } = Route.useParams();
  const uni = useQuery({ queryKey: ["university", id], queryFn: () => api.universities.get(id) });
  const progs = useQuery({
    queryKey: ["programmes", { universityId: id }],
    queryFn: () => api.programmes.listAll({ universityId: id }),
  });
  const events = useQuery({ queryKey: ["events", id], queryFn: () => api.universities.events(id) });
  const updates = useQuery({
    queryKey: ["updates", id],
    queryFn: () => api.universities.updatesAll(id),
  });
  const follow = useFollow();
  const [programmePage, setProgrammePage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [updatePage, setUpdatePage] = useState(1);
  const pageSize = 20;
  const programmes = progs.data ?? [];
  const eventItems = events.data ?? [];
  const updateItems = updates.data ?? [];
  const programmePageCount = Math.max(1, Math.ceil(programmes.length / pageSize));
  const eventPageCount = Math.max(1, Math.ceil(eventItems.length / pageSize));
  const updatePageCount = Math.max(1, Math.ceil(updateItems.length / pageSize));
  const currentProgrammePage = Math.min(programmePage, programmePageCount);
  const currentEventPage = Math.min(eventPage, eventPageCount);
  const currentUpdatePage = Math.min(updatePage, updatePageCount);
  const pageProgrammes = programmes.slice(
    (currentProgrammePage - 1) * pageSize,
    currentProgrammePage * pageSize,
  );
  const pageEvents = eventItems.slice(
    (currentEventPage - 1) * pageSize,
    currentEventPage * pageSize,
  );
  const pageUpdates = updateItems.slice(
    (currentUpdatePage - 1) * pageSize,
    currentUpdatePage * pageSize,
  );

  if (uni.isLoading)
    return (
      <PublicLayout surface>
        <Loading />
      </PublicLayout>
    );
  if (uni.error || !uni.data)
    return (
      <PublicLayout surface>
        <div className="mx-auto max-w-3xl p-12">
          <ErrorBox error={uni.error ?? new Error("University not found.")} />
        </div>
      </PublicLayout>
    );
  const u = uni.data;
  const followed = follow.ids.has(u._id);

  return (
    <PublicLayout surface>
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/universities">Universities</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{u.shortName ?? u.name}</span>
        </nav>
        <div className="card-surface flex flex-col gap-6 p-8 md:flex-row md:items-center">
          <UniAvatar uni={u} className="h-16 w-16 text-base" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={u.admissionStatus} />
              {u.type && <Tag>{humanize(u.type)} university</Tag>}
              {u.verified && <Tag tone="success">Verified</Tag>}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold">{u.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {[u.city, u.state].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={followed ? "secondary" : "outline"}
              onClick={() => follow.toggle(u._id)}
            >
              <Heart className={followed ? "h-4 w-4 fill-current text-primary" : "h-4 w-4"} />{" "}
              {followed ? "Following" : "Follow"}
            </Button>
            {u.admissionUrl && (
              <Button asChild>
                <a href={u.admissionUrl} target="_blank" rel="noreferrer">
                  Official portal <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses offered ({progs.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="process">Admission process</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="updates">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="card-surface p-6 md:col-span-2">
              <h2 className="text-lg font-bold">About</h2>
              <p className="mt-3 text-muted-foreground">
                {u.name} admits postgraduate students through CUET PG. It currently lists{" "}
                {progs.data?.length ?? 0} programmes on this portal. Admission status:{" "}
                <b className="text-foreground">{humanize(u.admissionStatus)}</b>
                {u.statusUpdatedAt ? ` (updated ${fmtDate(u.statusUpdatedAt)})` : ""}.
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-semibold">{u.type ? humanize(u.type) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">State</dt>
                  <dd className="font-semibold">{u.state}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total seats</dt>
                  <dd className="font-semibold">
                    {(progs.data ?? []).reduce((s, p) => s + (p.totalSeats ?? 0), 0) || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last verified</dt>
                  <dd className="font-semibold">{fmtDate(u.lastVerifiedAt)}</dd>
                </div>
              </dl>
            </div>
            <div className="card-surface space-y-3 p-6">
              <h2 className="text-lg font-bold">Official links</h2>
              {u.websiteUrl && (
                <a
                  className="flex items-center gap-2 text-sm text-primary"
                  href={u.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
              {u.admissionUrl && (
                <a
                  className="flex items-center gap-2 text-sm text-primary"
                  href={u.admissionUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" /> Admission portal
                </a>
              )}
              <p className="pt-3 text-xs text-muted-foreground">
                Applications and payments happen on official university portals only.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            {progs.isLoading ? (
              <Loading />
            ) : !programmes.length ? (
              <EmptyState title="No programmes listed yet" />
            ) : (
              <>
                <div className="card-surface divide-y">
                  {pageProgrammes.map((p) => (
                    <Link
                      key={p._id}
                      to="/programmes/$id"
                      params={{ id: p._id }}
                      className="flex flex-wrap items-center gap-4 p-5 transition-colors hover:bg-surface"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">
                          {p.programmeName ?? courseOf(p.course)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {courseOf(p.course)?.category} · {p.durationYears ?? 2} years
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {p.totalSeats ?? "—"} seats
                      </span>
                      <span className="text-sm font-semibold">{inr(p.annualFee)}/yr</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
                <PaginationControls
                  page={currentProgrammePage}
                  pageSize={pageSize}
                  total={programmes.length}
                  onPageChange={setProgrammePage}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="process" className="mt-6">
            <ol className="card-surface space-y-5 p-6">
              {[
                [
                  "Appear for CUET PG",
                  "Take the CUET PG paper matching your programme's paper code.",
                ],
                [
                  "Register on the university portal",
                  "Fill the university's own PG admission form after results.",
                ],
                [
                  "Track merit lists",
                  "Merit lists are published round by round — follow this university for alerts.",
                ],
                [
                  "Document verification",
                  "Upload or present documents as instructed by the university.",
                ],
                ["Pay fees & confirm", "Confirm your seat before the admission last date."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-muted-foreground">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            {events.isLoading ? (
              <Loading />
            ) : !eventItems.length ? (
              <EmptyState title="No upcoming events" />
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {pageEvents.map((e) => (
                    <div key={e._id} className="card-surface flex gap-4 p-5">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <div>
                        <Tag tone="primary">{humanize(e.type)}</Tag>
                        <p className="mt-2 font-semibold">{e.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {fmtDate(e.startsAt)}
                          {e.endsAt ? ` – ${fmtDate(e.endsAt)}` : ""}
                        </p>
                        {e.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  page={currentEventPage}
                  pageSize={pageSize}
                  total={eventItems.length}
                  onPageChange={setEventPage}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="updates" className="mt-6">
            {updates.isLoading ? (
              <Loading />
            ) : !updateItems.length ? (
              <EmptyState title="No announcements yet" />
            ) : (
              <>
                <div className="card-surface divide-y">
                  {pageUpdates.map((x) => (
                    <div key={x._id} className="flex gap-4 p-5">
                      {x.type === "MERIT_LIST" ? (
                        <Bell className="h-5 w-5 text-warning" />
                      ) : (
                        <Megaphone className="h-5 w-5 text-primary" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{x.title}</p>
                          <Tag>{humanize(x.type)}</Tag>
                        </div>
                        {x.summary && <p className="text-sm text-muted-foreground">{x.summary}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {timeAgo(x.publishedAt)}
                        </p>
                      </div>
                      {x.sourceUrl && (
                        <a
                          href={x.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                <PaginationControls
                  page={currentUpdatePage}
                  pageSize={pageSize}
                  total={updateItems.length}
                  onPageChange={setUpdatePage}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}
