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
      const res = await fetch("/api/auth/sign-in/social/github", {
        credentials: "include",
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
      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    set({ user: null, session: null });
  },
}));
