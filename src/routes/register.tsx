import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, PenSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common";
import { AuthLayout } from "@/components/layout/PublicLayout";
import { api, errorMessage } from "@/lib/api";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => seo("Create account", "Sign up free to build your CUET PG shortlist and get merit list alerts."),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"student" | "editor">("student");
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const validate = () => {
    if (f.name.trim().length < 2) return "Please enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return "Enter a valid email.";
    if (f.password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) return "Password needs a letter and a number.";
    if (f.password !== f.confirm) return "Passwords don't match.";
    return "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) return setErr(v);
    setErr("");
    setBusy(true);
    try {
      // The backend always creates students; editor/admin roles are granted by an admin
      const res = await api.auth.register({ name: f.name.trim(), email: f.email.trim(), password: f.password });
      toast.success(res.emailSent ? "Check your email for the verification code" : "Account created — request a new code to verify");
      if (role === "editor") toast.info("An admin needs to approve editor access after you verify.");
      navigate({ to: "/verify-email", search: { email: f.email.trim() } });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const RoleBtn = ({ value, icon, title, desc }: { value: "student" | "editor"; icon: React.ReactNode; title: string; desc: string }) => (
    <button type="button" onClick={() => setRole(value)}
      className={cn("flex flex-1 items-start gap-3 rounded-xl border p-4 text-left transition-all", role === value ? "border-primary bg-primary-soft" : "hover:border-primary/40")}>
      <span className="text-primary">{icon}</span>
      <span><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-muted-foreground">{desc}</span></span>
    </button>
  );

  return (
    <AuthLayout title="Create your account" subtitle="Free for every CUET PG aspirant.">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-3">
          <RoleBtn value="student" icon={<GraduationCap className="h-5 w-5" />} title="Student" desc="Track & shortlist" />
          <RoleBtn value="editor" icon={<PenSquare className="h-5 w-5" />} title="Editor" desc="Needs admin approval" />
        </div>
        <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" hint="8+ chars, letter & number"><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field label="Confirm"><Input type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></Field>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-semibold text-primary">Log in</Link></p>
    </AuthLayout>
  );
}
