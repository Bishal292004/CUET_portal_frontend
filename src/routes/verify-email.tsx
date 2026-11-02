import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common";
import { OtpInput } from "@/components/common/OtpInput";
import { AuthLayout } from "@/components/layout/PublicLayout";
import { api, errorMessage } from "@/lib/api";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>): { email?: string } => ({ email: typeof s.email === "string" ? s.email : undefined }),
  head: () => seo("Verify email", "Enter the 6-digit code we emailed you to activate your account."),
  component: Verify,
});

function Verify() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email ?? "");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return setErr("Enter the 6-digit code.");
    setBusy(true);
    setErr("");
    try {
      await api.auth.verifyEmail({ email, otp });
      setDone(true);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await api.auth.resendVerification(email);
      toast.success("If the account exists, a new code is on its way");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (done)
    return (
      <AuthLayout title="Email verified" subtitle="Your account is active.">
        <div className="card-surface flex flex-col items-center gap-4 p-8 text-center">
          <MailCheck className="h-10 w-10 text-success" />
          <p className="text-sm text-muted-foreground">You can now log in and set up your preferences.</p>
          <Button className="w-full" onClick={() => navigate({ to: "/login" })}>Continue to log in</Button>
        </div>
      </AuthLayout>
    );

  return (
    <AuthLayout title="Verify your email" subtitle="We sent a 6-digit code to your inbox. It expires in 10 minutes.">
      <form onSubmit={verify} className="space-y-5">
        <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Verification code"><OtpInput value={otp} onChange={setOtp} /></Field>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>Verify email</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Didn't get it? <button onClick={resend} disabled={!email} className="font-semibold text-primary">Resend code</button> · <Link to="/login" className="text-primary">Back to log in</Link>
      </p>
    </AuthLayout>
  );
}
