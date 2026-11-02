import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBox, Field, Loading, PageHeader, Tag, selectClass } from "@/components/common";
import { api, errorMessage } from "@/lib/api";
import { useCourses } from "@/lib/hooks";
import { refId } from "@/lib/format";
import { INDIAN_STATES } from "@/lib/mock-data";
import { seo } from "@/lib/seo";
import { CATEGORIES, type Category } from "@/lib/types";

export const Route = createFileRoute("/_student/profile")({
  head: () => seo("Profile & Preferences", "Update your details, CUET PG scores, preferred courses and password."),
  component: Profile,
});

type ScoreRow = { courseId: string; score: number; isExpected: boolean };

function Profile() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.me.get() });
  const courses = useCourses();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [states, setStates] = useState<string[]>([]);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [interested, setInterested] = useState<string[]>([]);
  const [cuetYear, setCuetYear] = useState<number>(new Date().getFullYear());
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  useEffect(() => {
    const u = me.data;
    if (!u) return;
    setName(u.name);
    setCategory(u.category ?? "");
    setStates(u.preferredStates ?? []);
    setEmailNotifications(u.emailNotifications);
    setInterested(u.interestedCourses.map(refId));
    setCuetYear(u.cuetYear ?? new Date().getFullYear());
    setScores(u.cuetScores.map((s) => ({ courseId: refId(s.course), score: s.score, isExpected: !!s.isExpected })));
  }, [me.data]);

  const done = (msg: string) => () => {
    toast.success(msg);
    qc.invalidateQueries();
  };
  const fail = (e: unknown) => toast.error(errorMessage(e));

  const saveDetails = useMutation({
    mutationFn: () => api.me.update({ name, category: category || undefined, preferredStates: states, emailNotifications }),
    onSuccess: done("Profile saved"),
    onError: fail,
  });
  const saveAcademic = useMutation({
    mutationFn: async () => {
      await api.me.setCourses(interested);
      await api.me.setScores({ cuetYear, scores: scores.filter((s) => s.courseId) });
    },
    onSuccess: done("Courses & scores saved"),
    onError: fail,
  });
  const savePw = useMutation({
    mutationFn: () => {
      if (pw.newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
      if (pw.newPassword !== pw.confirm) throw new Error("Passwords don't match.");
      return api.me.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
    },
    onSuccess: () => {
      toast.success("Password changed");
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
    },
    onError: fail,
  });

  if (me.isLoading) return <Loading />;
  if (me.error) return <ErrorBox error={me.error} />;

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile & preferences" description={me.data?.email} />
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Personal details</TabsTrigger>
          <TabsTrigger value="academic">Courses & scores</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="card-surface mt-6 space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Category" hint="Used to pick the right cutoff. General is assumed if empty.">
              <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                <option value="">Not set</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Preferred states">
            <div className="flex flex-wrap gap-2">
              {INDIAN_STATES.map((s) => {
                const on = states.includes(s);
                return (
                  <button key={s} type="button" onClick={() => setStates(on ? states.filter((x) => x !== s) : [...states, s])}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary bg-primary-soft font-semibold text-primary" : "text-muted-foreground hover:border-primary/40"}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
          <label className="flex items-center justify-between rounded-xl bg-surface p-4">
            <span><span className="block text-sm font-semibold">Email notifications</span><span className="text-xs text-muted-foreground">Merit lists and updates from followed universities</span></span>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </label>
          <Button onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending}>Save details</Button>
        </TabsContent>

        <TabsContent value="academic" className="card-surface mt-6 space-y-6 p-6">
          <Field label="Interested courses">
            <div className="grid gap-2 sm:grid-cols-2">
              {(courses.data ?? []).map((c) => (
                <label key={c._id} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <Checkbox checked={interested.includes(c._id)} onCheckedChange={(v) => setInterested(v ? [...interested, c._id] : interested.filter((x) => x !== c._id))} />
                  {c.name} <span className="ml-auto"><Tag>{c.cuetPaperCode}</Tag></span>
                </label>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="CUET year"><Input type="number" min={2022} value={cuetYear} onChange={(e) => setCuetYear(Number(e.target.value))} /></Field>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">CUET PG scores (out of 300)</p>
            {scores.map((s, i) => (
              <div key={i} className="grid items-center gap-2 md:grid-cols-[1fr_120px_auto_auto]">
                <select className={selectClass} value={s.courseId} onChange={(e) => setScores(scores.map((x, j) => (j === i ? { ...x, courseId: e.target.value } : x)))}>
                  <option value="">Choose course</option>
                  {(courses.data ?? []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <Input type="number" min={0} max={300} value={s.score} onChange={(e) => setScores(scores.map((x, j) => (j === i ? { ...x, score: Number(e.target.value) } : x)))} />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={s.isExpected} onCheckedChange={(v) => setScores(scores.map((x, j) => (j === i ? { ...x, isExpected: !!v } : x)))} /> Expected
                </label>
                <Button variant="ghost" size="icon" onClick={() => setScores(scores.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setScores([...scores, { courseId: "", score: 0, isExpected: true }])}><Plus className="h-4 w-4" /> Add score</Button>
          </div>
          <Button onClick={() => saveAcademic.mutate()} disabled={saveAcademic.isPending}>Save courses & scores</Button>
        </TabsContent>

        <TabsContent value="security" className="card-surface mt-6 max-w-lg space-y-4 p-6">
          <Field label="Current password"><Input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <Field label="New password" hint="At least 8 characters"><Input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <Field label="Confirm new password"><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
          <Button onClick={() => savePw.mutate()} disabled={savePw.isPending}>Change password</Button>
        </TabsContent>
      </Tabs>
    </>
  );
}
