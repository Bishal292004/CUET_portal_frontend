import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common";
import { AuthLayout } from "@/components/layout/PublicLayout";
import { api, errorMessage } from "@/lib/api";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => seo("Forgot password", "Request a password reset code for your CUET PG Counselling Assistant account."),
  component: Forgot,
});

function Forgot() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.auth.forgotPassword(email.trim());
      toast.success("If an account exists, we've emailed a reset code");
      navigate({ to: "/reset-password", search: { email: email.trim() } });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email and we'll send a 6-digit reset code.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>Send reset code</Button>
      </form>
      <p className="mt-6 text-center text-sm"><Link to="/login" className="text-primary">Back to log in</Link></p>
    </AuthLayout>
  );
}
