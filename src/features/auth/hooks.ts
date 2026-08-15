'use client';

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  AuthUser,
} from "./api";
import { useAuthStore } from "@/stores/authStore";

const AUTH_QUERY_KEY = ["auth", "me"];

export function useCurrentUser() {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  const query = useQuery<{ user: AuthUser }, Error>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const data = await fetchCurrentUser();
      setUser(data.user);
      return data;
    },
    retry: false,
  });

  useEffect(() => {
    if (query.isError) {
      clearUser();
    }
  }, [query.isError, clearUser]);

  return query;
}

export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      clearUser();
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });
}

