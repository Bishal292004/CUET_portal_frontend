import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, DEMO_TOKEN, TOKEN_KEY } from "./api";
import type { Role } from "./types";

type SessionUser = { id: string; name: string; email: string; role: Role };
type AuthCtx = {
  user: SessionUser | null;
  ready: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
};

const USER_KEY = "cuet_user";
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw && localStorage.getItem(TOKEN_KEY)) setUser(JSON.parse(raw));
    setIsDemo(localStorage.getItem(TOKEN_KEY) === DEMO_TOKEN);
    setReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await api.auth.login({ email, password });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setIsDemo(token === DEMO_TOKEN);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsDemo(false);
  };

  return <Ctx.Provider value={{ user, ready, isDemo, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export const homeForRole = (role: Role) => (role === "student" ? "/dashboard" : "/admin/universities");
