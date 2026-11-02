import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  ErrorBox,
  Field,
  Loading,
  PageHeader,
  StatusBadge,
  Tag,
  UniAvatar,
  selectClass,
} from "@/components/common";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PaginationControls } from "@/components/common/PaginationControls";
import { api } from "@/lib/api";
import { useCourses, useUniversities } from "@/lib/hooks";
import { courseOf, inr, STATUS_LABEL, uniOf } from "@/lib/format";
import { seo } from "@/lib/seo";
import { ADMISSION_STATUS } from "@/lib/types";

type S = {
  stream?: string;
  courseId?: string;
  state?: string;
  status?: string;
  maxFee?: string;
  minSeats?: string;
  sort?: string;
  page?: number;
};
const str = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : String(v));

export const Route = createFileRoute("/programmes/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    stream: str(s.stream),
    courseId: str(s.courseId),
    state: str(s.state),
    status: str(s.status),
    maxFee: str(s.maxFee),
    minSeats: str(s.minSeats),
    sort: str(s.sort),
    page: Number.isInteger(Number(s.page)) && Number(s.page) > 0 ? Number(s.page) : 1,
  }),
  head: () =>
    seo(
      "Programme Finder",
      "Match your stream to CUET PG master's programmes by state, fee, seats and admission status.",
    ),
  component: Finder,
});

function Finder() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/programmes/" });
  const set = (p: Partial<S>) =>
    navigate({ search: (prev: S) => ({ ...prev, ...p, page: 1 }), replace: true });
  const courses = useCourses();
  const unis = useUniversities();
  const { stream, page = 1, ...filters } = s;
  const progs = useQuery({
    queryKey: ["programmes", filters],
    queryFn: () => api.programmes.listAll(filters),
  });
  const PAGE_SIZE = 20;
  const matchingResults = (progs.data ?? []).filter(
    (p) => !stream || courseOf(p.course)?.category === stream,
  );
  const totalPages = Math.max(1, Math.ceil(matchingResults.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const streams = [
    ...new Set((courses.data ?? []).map((c) => c.category).filter(Boolean)),
  ] as string[];
  const coursesInStream = (courses.data ?? []).filter((c) => !stream || c.category === stream);
  const states = [...new Set((unis.data ?? []).map((u) => u.state))].sort();
  const results = matchingResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <PublicLayout surface>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <PageHeader
          eyebrow="Programme finder"
          title="Match your stream to a programme"
          description="Tell us your background — we'll list every matching master's programme."
        />
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="card-surface h-fit space-y-4 p-5">
            <Field label="Your stream / domain">
              <select
                className={selectClass}
                value={stream ?? ""}
                onChange={(e) => set({ stream: e.target.value || undefined, courseId: undefined })}
              >
                <option value="">Any stream</option>
                {streams.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Course">
              <select
                className={selectClass}
                value={s.courseId ?? ""}
                onChange={(e) => set({ courseId: e.target.value || undefined })}
              >
                <option value="">All courses</option>
                {coursesInStream.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="State">
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
            </Field>
            <Field label="Admission status">
              <select
                className={selectClass}
                value={s.status ?? ""}
                onChange={(e) => set({ status: e.target.value || undefined })}
              >
                <option value="">Any</option>
                {ADMISSION_STATUS.map((x) => (
                  <option key={x} value={x}>
                    {STATUS_LABEL[x]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max fee (₹)">
                <Input
                  type="number"
                  value={s.maxFee ?? ""}
                  onChange={(e) => set({ maxFee: e.target.value || undefined })}
                />
              </Field>
              <Field label="Min seats">
                <Input
                  type="number"
                  value={s.minSeats ?? ""}
                  onChange={(e) => set({ minSeats: e.target.value || undefined })}
                />
              </Field>
            </div>
            <Field label="Sort by">
              <select
                className={selectClass}
                value={s.sort ?? ""}
                onChange={(e) => set({ sort: e.target.value || undefined })}
              >
                <option value="">Relevance</option>
                <option value="fee_asc">Fee: low to high</option>
                <option value="fee_desc">Fee: high to low</option>
                <option value="seats_desc">Most seats</option>
              </select>
            </Field>
            <Button variant="outline" className="w-full" onClick={() => navigate({ search: {} })}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </aside>
          <section>
            <p className="mb-4 text-sm text-muted-foreground">
              <b className="text-foreground">{matchingResults.length}</b> matching programmes
            </p>
            {progs.isLoading ? (
              <Loading />
            ) : progs.error ? (
              <ErrorBox error={progs.error} />
            ) : results.length === 0 ? (
              <EmptyState
                title="No programmes match"
                description="Widen the fee or seat range, or pick another stream."
              />
            ) : (
              <>
                <div className="space-y-3">
                  {results.map((p) => {
                    const u = uniOf(p.university);
                    return (
                      <Link
                        key={p._id}
                        to="/programmes/$id"
                        params={{ id: p._id }}
                        className="card-surface card-hover flex flex-wrap items-center gap-4 p-5"
                      >
                        {u && <UniAvatar uni={u} />}
                        <div className="min-w-[200px] flex-1">
                          <p className="font-bold">{p.programmeName ?? courseOf(p.course)?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {u?.name} · {u?.city}, {u?.state}
                          </p>
                        </div>
                        <Tag>{courseOf(p.course)?.category}</Tag>
                        {u && <StatusBadge status={u.admissionStatus} />}
                        <div className="text-right text-sm">
                          <p className="font-semibold">{inr(p.annualFee)}/yr</p>
                          <p className="text-muted-foreground">{p.totalSeats ?? "—"} seats</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
                <PaginationControls
                  page={currentPage}
                  pageSize={PAGE_SIZE}
                  total={matchingResults.length}
                  onPageChange={(nextPage) =>
                    navigate({
                      search: (prev: S) => ({ ...prev, page: nextPage }),
                      replace: true,
                    })
                  }
                />
              </>
            )}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
