import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common";
import { OtpInput } from "@/components/common/OtpInput";
import { AuthLayout } from "@/components/layout/PublicLayout";
import { api, errorMessage } from "@/lib/api";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): { email?: string } => ({ email: typeof s.email === "string" ? s.email : undefined }),
  head: () => seo("Reset password", "Choose a new password using the code from your email."),
  component: Reset,
});

function Reset() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email ?? "");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return setErr("Enter the 6-digit code.");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw !== confirm) return setErr("Passwords don't match.");
    setBusy(true);
    setErr("");
    try {
      await api.auth.resetPassword({ email, otp, newPassword: pw });
      toast.success("Password updated — please log in");
      navigate({ to: "/login" });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Enter the code from your email and choose a new password.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Reset code"><OtpInput value={otp} onChange={setOtp} /></Field>
        <Field label="New password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="Confirm new password"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>Update password</Button>
      </form>
      <p className="mt-6 text-center text-sm"><Link to="/forgot-password" className="text-primary">Need a new code?</Link></p>
    </AuthLayout>
  );
}
