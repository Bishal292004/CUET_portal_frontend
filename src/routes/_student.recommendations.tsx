import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ChanceBadge, EmptyState, ErrorBox, Loading, PageHeader, StatusBadge, UniAvatar, selectClass } from "@/components/common";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useCourses } from "@/lib/hooks";
import { inr } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_student/recommendations")({
  head: () => seo("Recommendations", "Programmes and universities ranked for your CUET PG scores, category and preferred states."),
  component: Recs,
});

function Recs() {
  const courses = useCourses();
  const [courseId, setCourseId] = useState("");
  const recs = useQuery({ queryKey: ["recommendations", courseId], queryFn: () => api.me.recommendations({ courseId: courseId || undefined, limit: 20 }) });

  return (
    <>
      <PageHeader
        eyebrow="For you"
        title="Recommendations"
        description="Ranked by your chance, preferred states, open admissions and universities you follow."
        actions={
          <select className={`${selectClass} w-56`} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">My interested courses</option>
            {(courses.data ?? []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        }
      />
      {recs.isLoading ? <Loading /> : recs.error ? <ErrorBox error={recs.error} /> : !recs.data?.length ? (
        <EmptyState title="No recommendations yet" description="Add your courses and CUET scores in your profile." action={<Button asChild><Link to="/profile">Update profile</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recs.data.map((r, i) => (
            <div key={r.programme.id} className="card-surface card-hover flex flex-col p-6">
              <div className="flex items-start gap-3">
                <UniAvatar uni={r.programme.university} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">#{i + 1}</p>
                  <p className="font-bold">{r.programme.university.name}</p>
                  <p className="text-sm text-muted-foreground">{r.programme.programmeName ?? r.programme.course.name} · {inr(r.programme.annualFee)}/yr</p>
                </div>
                <ChanceBadge label={r.chance.label} />
              </div>
              <ul className="mt-4 space-y-1.5">
                {(r.reasons ?? []).map((why) => (
                  <li key={why} className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" />{why}</li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between pt-5">
                <StatusBadge status={r.programme.university.admissionStatus} />
                <Link to="/programmes/$id" params={{ id: r.programme.id }} className="flex items-center gap-1 text-sm font-semibold text-primary">Details <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
