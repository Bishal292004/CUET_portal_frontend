import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorBox, Field, Loading, PageHeader, selectClass } from "@/components/common";
import { api, errorMessage } from "@/lib/api";
import { useAdminMutation } from "@/lib/admin-hooks";
import { courseOf, uniOf } from "@/lib/format";
import { seo } from "@/lib/seo";
import { CATEGORIES } from "@/lib/types";

export const Route = createFileRoute("/admin/cutoffs")({
  head: () =>
    seo(
      "Programme Cutoffs",
      "Enter and update category-wise CUET PG closing scores by year and round.",
    ),
  component: Cutoffs,
});

function Cutoffs() {
  const progs = useQuery({
    queryKey: ["admin", "programmes"],
    queryFn: () => api.admin.programmes.listAll(),
  });
  const [pid, setPid] = useState("");
  const [round, setRound] = useState(1);
  const [years, setYears] = useState<number[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!pid && progs.data?.length) setPid(progs.data[0]._id);
  }, [progs.data, pid]);
  const q = useQuery({
    queryKey: ["admin", "cutoffs", pid],
    queryFn: () => api.admin.programmes.cutoffs(pid),
    enabled: !!pid,
  });
  const remove = useAdminMutation((id: string) => api.admin.cutoffs.remove(id), "Cutoff deleted");

  const cutoffs = q.data ?? [];
  const allYears = [...new Set([...cutoffs.map((c) => c.year), ...years])].sort((a, b) => b - a);
  const find = (y: number, cat: string) =>
    cutoffs.find((c) => c.year === y && c.round === round && c.category === cat);
  const key = (y: number, cat: string) => `${y}-${round}-${cat}`;

  useEffect(() => setDraft({}), [pid, round]);

  const saveAll = async () => {
    setSaving(true);
    let n = 0;
    try {
      for (const [k, raw] of Object.entries(draft)) {
        if (raw === "") continue;
        const [y, r, cat] = k.split("-");
        const closingScore = Number(raw);
        if (Number.isNaN(closingScore) || closingScore < 0 || closingScore > 300)
          throw new Error(`Score for ${cat} ${y} must be 0–300.`);
        const existing = find(Number(y), cat);
        if (existing) await api.admin.cutoffs.update(existing._id, { closingScore });
        else
          await api.admin.programmes.createCutoff(pid, {
            year: Number(y),
            round: Number(r),
            category: cat,
            closingScore,
            verified: true,
          });
        n++;
      }
      toast.success(`${n} cutoff${n === 1 ? "" : "s"} saved`);
      setDraft({});
      setYears([]);
      q.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const p = progs.data?.find((x) => x._id === pid);

  return (
    <>
      <PageHeader
        eyebrow="Data entry"
        title="Programme cutoffs"
        description="Closing CUET PG scores (out of 300). Type to edit — changes are saved together."
        actions={
          <Button onClick={saveAll} disabled={saving || !Object.keys(draft).length}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />
      <div className="card-surface mb-5 grid gap-4 p-5 md:grid-cols-[2fr_1fr_1fr]">
        <Field label="Programme">
          <select className={selectClass} value={pid} onChange={(e) => setPid(e.target.value)}>
            {(progs.data ?? []).map((x) => (
              <option key={x._id} value={x._id}>
                {uniOf(x.university)?.shortName ?? uniOf(x.university)?.name} —{" "}
                {x.programmeName ?? courseOf(x.course)?.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Round">
          <select
            className={selectClass}
            value={round}
            onChange={(e) => setRound(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Add a year">
          <select
            className={selectClass}
            value=""
            onChange={(e) => e.target.value && setYears([...years, Number(e.target.value)])}
          >
            <option value="">Choose year…</option>
            {Array.from({ length: new Date().getFullYear() + 2 - 2022 }, (_, i) => 2022 + i)
              .filter((y) => !allYears.includes(y))
              .map((y) => (
                <option key={y}>{y}</option>
              ))}
          </select>
        </Field>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : !allYears.length ? (
        <EmptyState
          title="No cutoffs yet"
          description="Add a year above to start entering scores."
          action={
            <Button variant="outline" onClick={() => setYears([new Date().getFullYear() - 1])}>
              <Plus className="h-4 w-4" /> Add {new Date().getFullYear() - 1}
            </Button>
          }
        />
      ) : (
        <div className="card-surface overflow-x-auto p-2">
          <p className="px-3 pt-2 text-sm font-semibold">
            {uniOf(p?.university)?.name} · {p?.programmeName}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                {CATEGORIES.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allYears.map((y) => (
                <TableRow key={y}>
                  <TableCell className="font-bold">{y}</TableCell>
                  {CATEGORIES.map((cat) => {
                    const ex = find(y, cat);
                    const k = key(y, cat);
                    const val = draft[k] ?? (ex ? String(ex.closingScore) : "");
                    return (
                      <TableCell key={cat}>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={300}
                            className={`h-9 w-20 ${draft[k] !== undefined ? "border-primary" : ""}`}
                            value={val}
                            placeholder="—"
                            onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                          />
                          {ex && (
                            <button
                              title="Delete"
                              onClick={() =>
                                confirm(`Delete ${cat} ${y} round ${round}?`) &&
                                remove.mutate(ex._id)
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
