import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bell, Building2, CalendarCheck, CheckCircle2, Search, Sparkles, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, Tag, UniAvatar } from "@/components/common";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { UniversityCard } from "@/components/university/UniversityCard";
import { useAllProgrammes, useCourses, useFollow, useUniversities } from "@/lib/hooks";
import { refId } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CUET PG Counselling Assistant — Universities, deadlines & merit lists" },
      { name: "description", content: "Discover CUET PG universities, track counselling deadlines, and get notified when merit lists are released." },
      { property: "og:title", content: "CUET PG Counselling Assistant" },
      { property: "og:description", content: "Discover universities, track deadlines and get merit list alerts — one simple dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const unis = useUniversities();
  const courses = useCourses();
  const progs = useAllProgrammes();
  const follow = useFollow();
  const list = unis.data ?? [];
  const programmes = progs.data ?? [];

  const trending = (courses.data ?? [])
    .map((c) => ({ c, n: programmes.filter((p) => refId(p.course) === c._id).length }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);

  return (
    <PublicLayout>
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="eyebrow">One place for your CUET PG journey</p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] md:text-7xl">
            Stop searching.<br /><span className="text-primary">Start choosing.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Discover universities, track counselling deadlines, and get notified when merit lists are released — all from one simple dashboard.
          </p>
          <form
            className="mt-8 flex max-w-xl gap-2 rounded-2xl border bg-background p-2 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/universities", search: { q } });
            }}
          >
            <div className="flex flex-1 items-center gap-2 pl-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search university, course or city…" className="border-0 shadow-none focus-visible:ring-0" />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/register">Build my shortlist <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/universities">Explore universities</Link>
            </Button>
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" /> Curated university data · Official portal links
          </p>
        </div>

        <div className="card-surface mx-auto w-full max-w-md p-6 shadow-[var(--shadow-lift)]">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-bold">My applications</p>
            <Tag tone="success">Live</Tag>
          </div>
          {list.slice(0, 3).map((u) => (
            <div key={u._id} className="flex items-center gap-3 border-b py-4 last:border-0">
              <UniAvatar uni={u} />
              <div className="flex-1">
                <p className="font-semibold">{u.name}</p>
                <p className="text-sm text-muted-foreground">{u.city}, {u.state}</p>
              </div>
              <StatusBadge status={u.admissionStatus} />
            </div>
          ))}
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface p-4">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Next deadline</p>
              <p className="text-sm text-muted-foreground">{list[0]?.name ?? "Pondicherry University"} · 8 days</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl border-t md:grid-cols-4">
        {[
          { icon: <Search className="h-6 w-6" />, t: "Discover", d: "Compare universities for your course", to: "/universities" },
          { icon: <Bell className="h-6 w-6" />, t: "Never miss", d: "Merit lists & important updates", to: "/notifications" },
          { icon: <CalendarCheck className="h-6 w-6" />, t: "Stay on track", d: "One calendar for every deadline", to: "/dashboard" },
          { icon: <Sparkles className="h-6 w-6" />, t: "Find more", d: "Smart rule-based alternatives", to: "/recommendations" },
        ].map((f) => (
          <Link key={f.t} to={f.to} className="flex gap-4 border-b p-8 transition-colors hover:bg-surface md:border-r md:last:border-r-0">
            <span className="text-primary">{f.icon}</span>
            <div>
              <p className="font-bold">{f.t}</p>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="bg-surface py-16">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-4 md:px-8">
          {[
            { v: list.length, l: "Participating universities", i: <Building2 className="h-5 w-5" /> },
            { v: (courses.data ?? []).length, l: "PG courses tracked", i: <TrendingUp className="h-5 w-5" /> },
            { v: programmes.length, l: "Programmes with cutoffs", i: <Sparkles className="h-5 w-5" /> },
            { v: programmes.reduce((s, p) => s + (p.totalSeats ?? 0), 0).toLocaleString("en-IN"), l: "Seats listed", i: <Users className="h-5 w-5" /> },
          ].map((s) => (
            <div key={s.l} className="card-surface p-6">
              <span className="text-primary">{s.i}</span>
              <p className="mt-3 text-3xl font-extrabold">{s.v}</p>
              <p className="text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-7xl px-4 md:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 className="mt-2 text-3xl font-extrabold">Universities accepting applications</h2>
            </div>
            <Link to="/universities" className="text-sm font-semibold text-primary">View all →</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.filter((u) => u.admissionStatus !== "CLOSED").slice(0, 3).map((u) => (
              <UniversityCard
                key={u._id}
                uni={u}
                programmes={programmes.filter((p) => refId(p.university) === u._id)}
                followed={follow.ids.has(u._id)}
                onToggleFollow={() => follow.toggle(u._id)}
              />
            ))}
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-7xl px-4 md:px-8">
          <p className="eyebrow">Trending</p>
          <h2 className="mt-2 text-3xl font-extrabold">Popular courses</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map(({ c, n }) => (
              <Link
                key={c._id}
                to="/programmes"
                search={{ courseId: c._id }}
                className="card-surface card-hover flex items-center justify-between p-5"
              >
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.category} · {c.cuetPaperCode}</p>
                </div>
                <Tag tone="primary">{n} universities</Tag>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-background px-4 py-10 text-center md:px-8">
        <h2 className="text-xl font-bold">Contact</h2>
        <p className="mt-2 text-sm text-muted-foreground">
           Questions? Email us at{" "}
          <a
            href="cuetpg.updatesportal@gmail.com"
            className="font-medium text-primary hover:underline"
          >
            cuetpg.updatesportal@gmail.com
          </a>
        </p>
      </section>
    </PublicLayout>
  );
}
