import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { EmptyState, Loading, PageHeader, Tag, selectClass } from "@/components/common";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAllProgrammes, useCourses } from "@/lib/hooks";
import { inr, refId } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/courses")({
  head: () =>
    seo(
      "Course Catalog",
      "Every postgraduate course offered through CUET PG, with CUET paper codes and university counts.",
    ),
  component: Courses,
});

function Courses() {
  const courses = useCourses();
  const progs = useAllProgrammes();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(1);
  const list = courses.data ?? [];
  const cats = [...new Set(list.map((c) => c.category).filter(Boolean))] as string[];
  const filtered = list.filter(
    (c) =>
      (!q || `${c.name} ${c.cuetPaperCode}`.toLowerCase().includes(q.toLowerCase())) &&
      (!cat || c.category === cat),
  );
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCourses = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <PublicLayout surface>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <PageHeader
          eyebrow="Course catalog"
          title="Postgraduate courses"
          description="Browse the master catalog and see which universities offer each course."
        />
        <div className="card-surface mb-6 grid gap-3 p-4 md:grid-cols-[2fr_1fr]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              placeholder="Search course or paper code…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className={selectClass}
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All streams</option>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {courses.isLoading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <EmptyState title="No courses found" />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pageCourses.map((c) => {
                const ps = (progs.data ?? []).filter((p) => refId(p.course) === c._id);
                const fees = ps.map((p) => p.annualFee ?? 0).filter(Boolean);
                return (
                  <Link
                    key={c._id}
                    to="/programmes"
                    search={{ courseId: c._id }}
                    className="card-surface card-hover p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      {c.cuetPaperCode && <Tag tone="primary">{c.cuetPaperCode}</Tag>}
                    </div>
                    <p className="mt-4 text-lg font-bold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.category}</p>
                    <div className="mt-4 flex justify-between border-t pt-3 text-sm">
                      <span className="text-muted-foreground">{ps.length} universities</span>
                      <span className="font-semibold">
                        {fees.length ? `from ${inr(Math.min(...fees))}` : "—"}
                      </span>
                    </div>
                  </Link>
                );
              })}
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
