import { create } from "zustand";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient } from "../../api/queryClient";
import { authEvents } from "../../api/authEvents";
import { authApi } from "./auth.api";
import { AuthResponse, LoginDto, RegisterDto, User } from "./auth.types";
import { useAppStore } from "../../store/appStore";
import { usePreferencesStore } from "../../store/preferencesStore";

type LogoutReason = "idle" | null;

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  logoutReason: LogoutReason;
  setCredentials: (payload: AuthResponse) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: (reason?: LogoutReason) => void;
  clearLogoutReason: () => void;
}

const storedToken = sessionStorage.getItem("token");
const storedUserRaw = sessionStorage.getItem("user");
const storedUser: User | null = storedUserRaw
  ? JSON.parse(storedUserRaw)
  : null;

export const useAuth = create<AuthState>((set) => ({
  user: storedUser,
  token: storedToken,
  isAuthenticated: Boolean(storedToken),
  loading: Boolean(storedToken),
  logoutReason: null,
  setCredentials: ({ user, token, preferences }) => {
    // Prevent stale data from a previous session from flashing for the new user.
    queryClient.clear();
    usePreferencesStore.getState().beginSession(preferences);
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true, loading: false, logoutReason: null });
  },
  setUser: (user) => {
    sessionStorage.setItem("user", JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  setLoading: (loading) => set({ loading }),
  clearLogoutReason: () => set({ logoutReason: null }),
  logout: (reason = null) => {
    void queryClient.cancelQueries();
    queryClient.clear();
    usePreferencesStore.getState().beginSession();
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    useAppStore.setState({ activeScreen: "dashboard" });
    set({ user: null, token: null, isAuthenticated: false, loading: false, logoutReason: reason });
  },
}));

// Any 401 response (e.g. token no longer maps to a valid user) forces an immediate
// in-memory logout, not just a storage clear, so stale UI can't linger post-refresh.
authEvents.onUnauthorized(() => {
  useAuth.getState().logout();
});

export const useLogin = () => {
  const setCredentials = useAuth((state) => state.setCredentials);

  const mutation = useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),
  });

  useEffect(() => {
    if (mutation.isSuccess && mutation.data) {
      setCredentials(mutation.data);
    }
  }, [mutation.isSuccess, mutation.data, setCredentials]);

  return mutation;
};

export const useRegister = () => {
  const setCredentials = useAuth((state) => state.setCredentials);

  const mutation = useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),
  });

  useEffect(() => {
    if (mutation.isSuccess && mutation.data) {
      setCredentials(mutation.data);
    }
  }, [mutation.isSuccess, mutation.data, setCredentials]);

  return mutation;
};

export const useGetMe = () => {
  const setUser = useAuth((state) => state.setUser);
  const token = useAuth((state) => state.token);
  const sessionId = usePreferencesStore((state) => state.sessionId);

  const query = useQuery({
    queryKey: ["user", sessionId],
    queryFn: ({ signal }) => authApi.getMe(signal),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess && query.data && useAuth.getState().token === token &&
        usePreferencesStore.getState().sessionId === sessionId) {
      const { preferences, ...user } = query.data;
      usePreferencesStore.getState().setPreferences(sessionId, preferences);
      setUser(user);
    }
  }, [query.isSuccess, query.data, setUser, token, sessionId]);

  return query;
};

export const useLogout = () => {
  const logout = useAuth((state) => state.logout);

  return () => {
    authApi.logout();
    logout();
  };
};
