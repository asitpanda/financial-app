import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePreferencesStore } from "../../store/preferencesStore";
import { preferencesApi } from "./preferences.api";
import type { UserPreferences } from "./preferences.types";

type PreferenceWrite = {
  patch: Partial<UserPreferences>;
  sessionId: number;
};

export function useSavePreferences() {
  const sessionId = usePreferencesStore((state) => state.sessionId);
  const queryClient = useQueryClient();
  const queryKey = ["user-preferences", sessionId];

  const mutation = useMutation({
    mutationKey: queryKey,
    mutationFn: ({ patch, sessionId: writeSession }: PreferenceWrite) => {
      if (usePreferencesStore.getState().sessionId !== writeSession) {
        throw new Error("The active session has changed.");
      }
      return preferencesApi.update(patch);
    },
    onMutate: async ({ sessionId: writeSession }: PreferenceWrite) => {
      if (!usePreferencesStore.getState().beginSave(writeSession)) {
        throw new Error("A preferences save is already in progress or the session has changed.");
      }
      try {
        await queryClient.cancelQueries({ queryKey: ["user-preferences", writeSession] });
      } catch (error) {
        usePreferencesStore.getState().finishSave(writeSession);
        throw error;
      }
      return { sessionId: writeSession };
    },
    onSuccess: (preferences, { sessionId: writeSession }) => {
      if (usePreferencesStore.getState().sessionId !== writeSession) return;
      queryClient.setQueryData(["user-preferences", writeSession], preferences);
      usePreferencesStore.getState().setPreferences(writeSession, preferences);
    },
    onSettled: (_data, _error, _patch, context) => {
      if (context) usePreferencesStore.getState().finishSave(context.sessionId);
    },
  });

  type SaveOptions = Parameters<typeof mutation.mutate>[1];
  return {
    ...mutation,
    mutate: (patch: Partial<UserPreferences>, options?: SaveOptions) =>
      mutation.mutate({ patch, sessionId }, options),
    mutateAsync: (patch: Partial<UserPreferences>, options?: SaveOptions) =>
      mutation.mutateAsync({ patch, sessionId }, options),
  };
}

export function usePreferences() {
  const sessionId = usePreferencesStore((state) => state.sessionId);
  const isSaving = usePreferencesStore((state) => state.isSaving);
  const mutation = useSavePreferences();
  const query = useQuery({
    queryKey: ["user-preferences", sessionId],
    queryFn: ({ signal }) => preferencesApi.get(signal),
    enabled: !isSaving,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      usePreferencesStore.getState().setPreferences(sessionId, query.data);
    }
  }, [sessionId, query.data]);

  return { query, mutation, isSaving };
}