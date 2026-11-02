import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common";
import { AuthLayout } from "@/components/layout/PublicLayout";
import { ApiError, errorMessage } from "@/lib/api";
import { homeForRole, useAuth } from "@/lib/auth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => seo("Log in", "Log in to track CUET PG universities, deadlines and merit lists."),
  component: Login,
});

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
      navigate({ to: homeForRole(u.role) });
    } catch (e) {
      // 403 = email not verified yet
      if (e instanceof ApiError && e.status === 403 && /verif/i.test(e.message)) {
        navigate({ to: "/verify-email", search: { email } });
        return;
      }
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your counselling dashboard.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
        <Field label="Password"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="text-right"><Link to="/forgot-password" className="text-sm text-primary">Forgot password?</Link></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">New here? <Link to="/register" className="font-semibold text-primary">Create an account</Link></p>
      
    </AuthLayout>
  );
}
