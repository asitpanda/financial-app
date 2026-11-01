import { beforeEach, describe, expect, it } from "vitest";
import { usePreferencesStore } from "./preferencesStore";

describe("preferencesStore", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ preferences: null, sessionId: 0 });
  });

  describe("beginSession", () => {
    it("clears the previous user's preferences when the session ends", () => {
      usePreferencesStore.getState().beginSession({ currencyDisplay: "code" });
      usePreferencesStore.getState().beginSession();
      expect(usePreferencesStore.getState().preferences).toBeNull();
    });
  });

  describe("setPreferences", () => {
    it("ignores a late response from a previous session", () => {
      usePreferencesStore.getState().beginSession({ currencyDisplay: "code" });
      const previousSession = usePreferencesStore.getState().sessionId;
      usePreferencesStore.getState().beginSession({ currencyDisplay: "symbol" });
      usePreferencesStore.getState().setPreferences(previousSession, { currencyDisplay: "code" });
      expect(usePreferencesStore.getState().preferences).toEqual({ currencyDisplay: "symbol" });
    });
  });
});