import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorBox, Loading, PageHeader, selectClass } from "@/components/common";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { UniversityCard } from "@/components/university/UniversityCard";
import { PaginationControls } from "@/components/common/PaginationControls";
import { useAllProgrammes, useCourses, useFollow, useUniversities } from "@/lib/hooks";
import { refId, STATUS_LABEL } from "@/lib/format";
import { seo } from "@/lib/seo";
import { ADMISSION_STATUS } from "@/lib/types";

type S = { q?: string; courseId?: string; state?: string; status?: string; maxFee?: string };
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/universities/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: str(s.q),
    courseId: str(s.courseId),
    state: str(s.state),
    status: str(s.status),
    maxFee: s.maxFee ? String(s.maxFee) : undefined,
  }),
  head: () =>
    seo(
      "University Directory",
      "Filter CUET PG participating universities by course, state, admission status and fee.",
    ),
  component: Directory,
});

function Directory() {
  const s = Route.useSearch();
  const [page, setPage] = useState(1);
  const navigate = useNavigate({ from: "/universities/" });
  const set = (patch: Partial<S>) => {
    setPage(1);
    return navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });
  };
  const unis = useUniversities();
  const progs = useAllProgrammes();
  const courses = useCourses();
  const follow = useFollow();

  const all = unis.data ?? [];
  const programmes = progs.data ?? [];
  const states = [...new Set(all.map((u) => u.state))].sort();
  const q = (s.q ?? "").toLowerCase();

  const filtered = all.filter((u) => {
    const ps = programmes.filter((p) => refId(p.university) === u._id);
    const courseNames = ps
      .map((p) => (typeof p.course === "object" ? p.course.name : ""))
      .join(" ");
    if (
      q &&
      !`${u.name} ${u.shortName} ${u.city} ${u.state} ${courseNames}`.toLowerCase().includes(q)
    )
      return false;
    if (s.state && u.state !== s.state) return false;
    if (s.status && u.admissionStatus !== s.status) return false;
    if (s.courseId && !ps.some((p) => refId(p.course) === s.courseId)) return false;
    if (s.maxFee && !ps.some((p) => (p.annualFee ?? 0) <= Number(s.maxFee))) return false;
    return true;
  });
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageUniversities = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <PublicLayout surface>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <PageHeader
          eyebrow="University directory"
          title="Find your right university"
          description="Explore curated CUET PG options across popular postgraduate courses."
        />
        <div className="card-surface grid gap-3 p-4 md:grid-cols-[2fr_1.4fr_1fr_1.2fr_0.8fr_auto]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              placeholder="Search university or course…"
              value={s.q ?? ""}
              onChange={(e) => set({ q: e.target.value || undefined })}
            />
          </div>
          <select
            className={selectClass}
            value={s.courseId ?? ""}
            onChange={(e) => set({ courseId: e.target.value || undefined })}
          >
            <option value="">All courses</option>
            {(courses.data ?? []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={s.state ?? ""}
            onChange={(e) => set({ state: e.target.value || undefined })}
          >
            <option value="">All states</option>
            {states.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={s.status ?? ""}
            onChange={(e) => set({ status: e.target.value || undefined })}
          >
            <option value="">All statuses</option>
            {ADMISSION_STATUS.map((x) => (
              <option key={x} value={x}>
                {STATUS_LABEL[x]}
              </option>
            ))}
          </select>
          <Input
            className="h-10"
            type="number"
            placeholder="Max fee"
            value={s.maxFee ?? ""}
            onChange={(e) => set({ maxFee: e.target.value || undefined })}
          />
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              setPage(1);
              navigate({ search: {} });
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
        <div className="my-5 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            <b className="text-foreground">{filtered.length}</b> universities found
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <SlidersHorizontal className="h-4 w-4" /> Filters update instantly
          </span>
        </div>
        {unis.isLoading || progs.isLoading ? (
          <Loading />
        ) : unis.error || progs.error ? (
          <ErrorBox error={unis.error ?? progs.error} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No universities match" description="Try removing a filter." />
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {pageUniversities.map((u) => (
                <UniversityCard
                  key={u._id}
                  uni={u}
                  programmes={programmes.filter((p) => refId(p.university) === u._id)}
                  followed={follow.ids.has(u._id)}
                  onToggleFollow={() => follow.toggle(u._id)}
                />
              ))}
            </div>
            <PaginationControls
              page={currentPage}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </PublicLayout>
  );
}
