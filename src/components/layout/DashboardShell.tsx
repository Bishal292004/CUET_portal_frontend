import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Calculator,
  ClipboardList,
  Heart,
  LayoutDashboard,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  Search,
  ScanSearch,
  Sparkles,
  Table2,
  User,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { DemoBanner, Logo } from "@/components/common";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: ReactNode; badge?: number | undefined };

export function DashboardShell({
  variant,
  children,
}: {
  variant: "student" | "admin";
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = useQuery({
    queryKey: ["unread"],
    queryFn: () => api.me.notifications.unreadCount(),
    enabled: variant === "student",
  });

  const student: Item[] = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/universities", label: "Universities", icon: <Building2 className="h-4 w-4" /> },
    { to: "/programmes", label: "Programme finder", icon: <Search className="h-4 w-4" /> },
    { to: "/recommendations", label: "Recommendations", icon: <Sparkles className="h-4 w-4" /> },
    {
      to: "/admission-chances",
      label: "Admission chances",
      icon: <Calculator className="h-4 w-4" />,
    },
    { to: "/followed-universities", label: "Followed", icon: <Heart className="h-4 w-4" /> },
    {
      to: "/notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
      badge: unread.data,
    },
  ];
  const admin: Item[] = [
    { to: "/admin/universities", label: "Universities", icon: <Building2 className="h-4 w-4" /> },
    { to: "/admin/courses", label: "Courses", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/admin/programmes", label: "Programmes", icon: <Layers className="h-4 w-4" /> },
    { to: "/admin/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
    { to: "/admin/scraper", label: "Scraper review", icon: <ScanSearch className="h-4 w-4" /> },
    { to: "/admin/events", label: "Events", icon: <CalendarDays className="h-4 w-4" /> },
    { to: "/admin/cutoffs", label: "Cutoffs", icon: <Table2 className="h-4 w-4" /> },
    ...(user?.role === "admin"
      ? [
          { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
          {
            to: "/admin/audit-logs",
            label: "Audit logs",
            icon: <ClipboardList className="h-4 w-4" />,
          },
        ]
      : []),
  ];
  const items = variant === "student" ? student : admin;

  const side = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Logo />
      <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">
          {user?.name?.[0]?.toUpperCase() ?? "S"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user?.name ?? "Student"}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {variant === "student" ? "CUET PG Aspirant" : `${user?.role ?? "editor"} · Content`}
          </p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{
              className: "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
            }}
          >
            {i.icon}
            <span className="flex-1">{i.label}</span>
            {!!i.badge && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {i.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t pt-4">
        {variant === "student" ? (
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            activeProps={{
              className: "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
            }}
          >
            <User className="h-4 w-4" /> Profile & preferences
          </Link>
        ) : (
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Building2 className="h-4 w-4" /> View public site
          </Link>
        )}
        <button
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <DemoBanner />
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r bg-sidebar lg:block">
          {side}
        </aside>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
            <aside className="relative h-full w-72 bg-sidebar">{side}</aside>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden">
            <Logo />
            <button onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X /> : <Menu />}
            </button>
          </div>
          <main className={cn("mx-auto max-w-6xl px-4 py-8 md:px-10 md:py-12")}>{children}</main>
        </div>
      </div>
    </div>
  );
}
