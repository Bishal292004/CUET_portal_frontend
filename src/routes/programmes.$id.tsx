import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Calculator, ChevronRight, ClipboardCheck, GraduationCap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorBox, Loading, StatCard, StatusBadge, Tag, UniAvatar, selectClass } from "@/components/common";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { api } from "@/lib/api";
import { courseOf, fmtDate, inr, uniOf } from "@/lib/format";
import { seo } from "@/lib/seo";
import { CATEGORIES } from "@/lib/types";

export const Route = createFileRoute("/programmes/$id")({
  head: () => seo("Programme details & cutoffs", "Eligibility, seat matrix and category-wise CUET PG cutoffs by year and round."),
  component: ProgrammeDetails,
});

// Central-university reservation shares, used only to illustrate the seat split
const SHARE: Record<string, number> = { GEN: 0.405, OBC: 0.27, SC: 0.15, ST: 0.075, EWS: 0.1 };

function ProgrammeDetails() {
  const { id } = Route.useParams();
  const prog = useQuery({ queryKey: ["programme", id], queryFn: () => api.programmes.get(id) });
  const cut = useQuery({ queryKey: ["cutoffs", id], queryFn: () => api.programmes.cutoffs(id) });
  const [round, setRound] = useState("1");

  if (prog.isLoading) return <PublicLayout surface><Loading /></PublicLayout>;
  if (prog.error || !prog.data) return <PublicLayout surface><div className="mx-auto max-w-3xl p-12"><ErrorBox error={prog.error} /></div></PublicLayout>;
  const p = prog.data;
  const u = uniOf(p.university);
  const c = courseOf(p.course);
  const cutoffs = cut.data ?? [];
  const years = [...new Set(cutoffs.map((x) => x.year))].sort((a, b) => b - a);
  const rounds = [...new Set(cutoffs.map((x) => x.round))].sort();
  const cats = CATEGORIES.filter((k) => cutoffs.some((x) => x.category === k));
  const cell = (year: number, cat: string) => cutoffs.find((x) => x.year === year && x.category === cat && String(x.round) === round)?.closingScore;

  return (
    <PublicLayout surface>
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/programmes">Programmes</Link><ChevronRight className="h-4 w-4" />
          {u && <><Link to="/universities/$id" params={{ id: u._id }}>{u.shortName ?? u.name}</Link><ChevronRight className="h-4 w-4" /></>}
          <span className="text-foreground">{p.programmeName ?? c?.name}</span>
        </nav>

        <div className="card-surface flex flex-col gap-5 p-8 md:flex-row md:items-center">
          {u && <UniAvatar uni={u} className="h-16 w-16" />}
          <div className="flex-1">
            <div className="flex gap-2">{u && <StatusBadge status={u.admissionStatus} />}{c?.cuetPaperCode && <Tag tone="primary">{c.cuetPaperCode}</Tag>}</div>
            <h1 className="mt-3 text-3xl font-extrabold">{p.programmeName ?? c?.name}</h1>
            <p className="text-muted-foreground">{u?.name} · {u?.city}, {u?.state}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/admission-chances" search={{ courseId: c?._id }}><Calculator className="h-4 w-4" /> Check my chances</Link></Button>
            {(p.sourceUrl || u?.admissionUrl) && <Button asChild><a href={p.sourceUrl ?? u?.admissionUrl} target="_blank" rel="noreferrer">Apply on portal <ArrowUpRight className="h-4 w-4" /></a></Button>}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard icon={<GraduationCap className="h-5 w-5" />} value={`${p.durationYears ?? 2} yrs`} label="Duration" />
          <StatCard icon={<ClipboardCheck className="h-5 w-5" />} value={p.totalSeats ?? "—"} label="Total seats" tone="success" />
          <StatCard icon={<ClipboardCheck className="h-5 w-5" />} value={p.seatsAvailable ?? "—"} label="Seats available" tone="warning" />
          <StatCard icon={<span className="font-bold">₹</span>} value={inr(p.annualFee)} label="Annual fee" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="card-surface space-y-5 p-6 lg:col-span-1">
            <div>
              <h2 className="text-lg font-bold">Eligibility</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.eligibility ?? "See the official prospectus for eligibility."}</p>
            </div>
            <div>
              <h2 className="text-lg font-bold">Syllabus</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Entrance is through CUET PG paper <b className="text-foreground">{c?.cuetPaperCode ?? "—"}</b> ({c?.category}). The programme syllabus is published in the university's PG prospectus.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-bold">Seat matrix</h2>
              <p className="mb-3 text-xs text-muted-foreground">Estimated from standard central-university reservation shares.</p>
              {Object.entries(SHARE).map(([k, v]) => (
                <div key={k} className="mb-2">
                  <div className="flex justify-between text-sm"><span>{k}</span><span className="font-semibold">{p.totalSeats ? Math.round(p.totalSeats * v) : "—"}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${v * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Last verified {fmtDate(p.lastVerifiedAt)}</p>
          </div>

          <div className="card-surface p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Historical cutoffs</h2>
                <p className="text-sm text-muted-foreground">Closing CUET PG score (out of 300) by category.</p>
              </div>
              <select className={`${selectClass} w-36`} value={round} onChange={(e) => setRound(e.target.value)}>
                {(rounds.length ? rounds : [1]).map((r) => <option key={r} value={r}>Round {r}</option>)}
              </select>
            </div>
            {cut.isLoading ? <Loading /> : !cutoffs.length ? <EmptyState title="No cutoffs published yet" /> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Year</TableHead>{cats.map((k) => <TableHead key={k} className="text-right">{k}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((y) => (
                    <TableRow key={y}>
                      <TableCell className="font-semibold">{y}</TableCell>
                      {cats.map((k) => (
                        <TableCell key={k} className="text-right">
                          {cell(y, k) !== undefined ? <span className={k === "GEN" ? "font-bold text-primary" : "font-medium"}>{cell(y, k)}</span> : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
