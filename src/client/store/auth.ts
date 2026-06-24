import { create } from "zustand";

interface GithubUser {
  id: string;
  name: string;
  email: string;
  image: string;
}

interface AuthSession {
  user: GithubUser;
}

interface AuthState {
  user: GithubUser | null;
  session: AuthSession | null;
  loading: boolean;
  fetchSession: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  fetchSession: async () => {
    try {
      const res = await fetch("/api/auth/get-session", {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as { user?: GithubUser } | null;
        if (data?.user) {
          set({ user: data.user, session: { user: data.user }, loading: false });
        } else {
          set({ user: null, session: null, loading: false });
        }
      } else {
        set({ user: null, session: null, loading: false });
      }
    } catch {
      set({ user: null, session: null, loading: false });
    }
  },

  login: async () => {
    try {
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "github" }),
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string; redirect?: string };
        const redirectUrl = data.url ?? data.redirect;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      }
    } catch {
      // ignore
    }
  },

  logout: async () => {
    try {
      const res = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        console.warn("[auth] sign-out returned", res.status);
      }
    } catch (err) {
      console.warn("[auth] sign-out failed:", err);
    }
    set({ user: null, session: null });
  },
}));
