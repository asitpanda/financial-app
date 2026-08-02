import { create } from "zustand";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient } from "../../api/queryClient";
import { authApi } from "./auth.api";
import { AuthResponse, LoginDto, RegisterDto, User } from "./auth.types";
import { useAppStore } from "../../store/appStore";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setCredentials: (payload: AuthResponse) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
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
  loading: false,
  setCredentials: ({ user, token }) => {
    // Prevent stale data from a previous session from flashing for the new user.
    queryClient.clear();
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  setUser: (user) => {
    sessionStorage.setItem("user", JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  setLoading: (loading) => set({ loading }),
  logout: () => {
    void queryClient.cancelQueries();
    queryClient.clear();
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    useAppStore.setState({ activeScreen: "dashboard" });
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

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

  const query = useQuery({
    queryKey: ["user"],
    queryFn: authApi.getMe,
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setUser(query.data);
    }
  }, [query.isSuccess, query.data, setUser]);

  return query;
};

export const useLogout = () => {
  const logout = useAuth((state) => state.logout);

  return () => {
    authApi.logout();
    logout();
  };
};
