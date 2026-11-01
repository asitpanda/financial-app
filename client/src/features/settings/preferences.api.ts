import apiClient from "../../api/client";
import type { UserPreferences } from "./preferences.types";

export const preferencesApi = {
  get: async (signal?: AbortSignal): Promise<UserPreferences> => {
    const response = await apiClient.get("/users/me/preferences", {
      signal,
      headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
    });
    return response.data;
  },
  update: async (patch: Partial<UserPreferences>): Promise<UserPreferences> => {
    const response = await apiClient.patch("/users/me/preferences", patch, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
    });
    return response.data;
  },
};