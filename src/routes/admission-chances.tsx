import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  ChanceBadge,
  EmptyState,
  Field,
  Loading,
  PageHeader,
  UniAvatar,
  selectClass,
} from "@/components/common";
import { AdaptiveLayout } from "@/components/layout/AdaptiveLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BANDS, estimateChance, pickCutoff, RANK } from "@/lib/chance";
import { useCourses } from "@/lib/hooks";
import { courseOf, inr, refId, uniOf } from "@/lib/format";
import { seo } from "@/lib/seo";
import { CATEGORIES } from "@/lib/types";

export const Route = createFileRoute("/admission-chances")({
  validateSearch: (s: Record<string, unknown>): { courseId?: string } => ({
    courseId: typeof s.courseId === "string" ? s.courseId : undefined,
  }),
  head: () =>
    seo(
      "Admission Chances Calculator",
      "Estimate your admission chances from last year's CUET PG closing cutoffs.",
    ),
  component: Chances,
});

function Chances() {
  const search = Route.useSearch();
  const { user } = useAuth();
  const courses = useCourses();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.me.get(),
    enabled: user?.role === "student",
  });
  const [courseId, setCourseId] = useState(search.courseId ?? "");
  const [category, setCategory] = useState("GEN");
  const [score, setScore] = useState(180);

  useEffect(() => {
    if (!courseId && courses.data?.length) setCourseId(courses.data[0]._id);
  }, [courses.data, courseId]);
  // Pre-fill from the student's saved profile
  useEffect(() => {
    if (!me.data) return;
    if (me.data.category) setCategory(me.data.category);
    const s = me.data.cuetScores.find((x) => refId(x.course) === courseId);
    if (s) setScore(s.score);
  }, [me.data, courseId]);

  const progs = useQuery({
    queryKey: ["programmes", { courseId }],
    queryFn: () => api.programmes.listAll({ courseId }),
    enabled: !!courseId,
  });
  const cutQs = useQueries({
    queries: (progs.data ?? []).map((p) => ({
      queryKey: ["cutoffs", p._id],
      queryFn: () => api.programmes.cutoffs(p._id),
    })),
  });

  const rows = (progs.data ?? [])
    .map((p, i) => {
      const cutoff = pickCutoff(cutQs[i]?.data ?? [], category);
      return { p, chance: estimateChance({ score, cutoff, studentCategory: category }) };
    })
    .sort((a, b) => RANK[b.chance.label] - RANK[a.chance.label]);

  return (
    <AdaptiveLayout>
      <PageHeader
        eyebrow="Calculator"
        title="Admission chances"
        description="Slide your CUET PG score and see where you stand against last year's closing cutoffs."
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="card-surface h-fit space-y-5 p-6">
          <Field label="Course">
            <select
              className={selectClass}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {(courses.data ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Your score (out of 300)">
            <div className="flex items-center gap-3">
              <Slider
                value={[score]}
                min={0}
                max={300}
                step={1}
                onValueChange={(v) => setScore(v[0])}
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                max={300}
                value={score}
                onChange={(e) => setScore(Math.max(0, Math.min(300, Number(e.target.value))))}
                className="w-20"
              />
            </div>
          </Field>
          <div className="rounded-xl bg-surface p-4 text-xs text-muted-foreground">
            <p className="mb-2 flex items-center gap-1 font-semibold text-foreground">
              <Info className="h-3.5 w-3.5" /> How it's calculated
            </p>
            High: ≥{BANDS.high} above cutoff · Moderate: within ±10 · Low: up to{" "}
            {Math.abs(BANDS.low)} below · Unlikely: further. Uses your category's latest cutoff, or
            General if none.
          </div>
          {!user && (
            <p className="text-xs text-muted-foreground">
              <Link to="/register" className="font-semibold text-primary">
                Create an account
              </Link>{" "}
              to save scores and get alerts.
            </p>
          )}
        </div>

        <div>
          {progs.isLoading ? (
            <Loading />
          ) : !rows.length ? (
            <EmptyState title="No programmes for this course yet" />
          ) : (
            <div className="space-y-3">
              {rows.map(({ p, chance }) => {
                const u = uniOf(p.university);
                const pct = chance.cutoff
                  ? Math.max(
                      4,
                      Math.min(100, (score / Math.max(chance.cutoff.closingScore + 30, 1)) * 100),
                    )
                  : 0;
                return (
                  <Link
                    key={p._id}
                    to="/programmes/$id"
                    params={{ id: p._id }}
                    className="card-surface card-hover block p-5"
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      {u && <UniAvatar uni={u} />}
                      <div className="min-w-[180px] flex-1">
                        <p className="font-bold">{u?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.programmeName ?? courseOf(p.course)?.name} · {inr(p.annualFee)}/yr
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          Cutoff{" "}
                          {chance.cutoff
                            ? `${chance.cutoff.closingScore} (${chance.cutoff.category} ${chance.cutoff.year})`
                            : "—"}
                        </p>
                        {chance.difference !== undefined && (
                          <p
                            className={
                              chance.difference >= 0
                                ? "font-semibold text-success"
                                : "font-semibold text-destructive"
                            }
                          >
                            {chance.difference >= 0 ? "+" : ""}
                            {chance.difference} marks
                          </p>
                        )}
                      </div>
                      <ChanceBadge label={chance.label} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {chance.cutoff && (
                      <div className="mt-4 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdaptiveLayout>
  );
}
