import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DemoBanner, Logo } from "@/components/common";
import { homeForRole, useAuth } from "@/lib/auth";

const NAV = [
  { to: "/universities", label: "Universities" },
  { to: "/courses", label: "Courses" },
  { to: "/programmes", label: "Programme finder" },
  { to: "/admission-chances", label: "Chances" },
] as const;

export function PublicLayout({ children, surface = false }: { children: ReactNode; surface?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className={surface ? "min-h-screen bg-surface" : "min-h-screen bg-background"}>
      <DemoBanner />
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 py-3 md:px-8">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden items-center gap-7 lg:flex">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{ className: "text-sm font-semibold text-primary" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Button asChild>
                <Link to={homeForRole(user.role)}>Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="border-t px-4 pb-4 md:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="block py-2 text-sm" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {user ? (
                <Button asChild className="flex-1">
                  <Link to={homeForRole(user.role)}>Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="flex-1">
                    <Link to="/login">Log in</Link>
                  </Button>
                  <Button asChild className="flex-1">
                    <Link to="/register">Get started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main>{children}</main>
      <footer className="border-t bg-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4 md:px-8">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Discover universities, track counselling deadlines and get notified when merit lists drop. Always confirm details on official university portals.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Explore</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/universities">Universities</Link></li>
              <li><Link to="/courses">Courses</Link></li>
              <li><Link to="/programmes">Programme finder</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Account</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/login">Log in</Link></li>
              <li><Link to="/register">Create account</Link></li>
              <li><Link to="/forgot-password">Forgot password</Link></li>
            </ul>
          </div>
        </div>
        <p className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} CUET PG Counselling Assistant</p>
      </footer>
    </div>
  );
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="[&_*]:text-primary-foreground">
          <Logo />
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">Stop searching.<br />Start choosing.</h2>
          <p className="mt-4 max-w-md opacity-80">
            One dashboard for every CUET PG university, deadline and merit list you care about.
          </p>
        </div>
        <p className="text-xs opacity-70">Curated university data · Official portal links</p>
      </div>
      <div className="flex flex-col">
        <DemoBanner />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden"><Logo /></div>
            <h1 className="text-3xl font-extrabold">{title}</h1>
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
