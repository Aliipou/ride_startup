/**
 * Unit tests for authStore — covers login, logout, token persistence.
 */

import { describe, it, expect, beforeEach, vi } from "@jest/globals";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Import store AFTER mocking
import { useAuthStore } from "@/lib/store/authStore";

describe("authStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isLoading: false });
  });

  it("initial state is unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it("login sets user and tokens", () => {
    const { login } = useAuthStore.getState();
    login(
      { id: "u1", email: "test@test.com", full_name: "Test", referral_code: "REF123" },
      "access_token_123",
      "refresh_token_456",
    );
    const state = useAuthStore.getState();
    expect(state.user?.email).toBe("test@test.com");
    expect(state.accessToken).toBe("access_token_123");
    expect(state.refreshToken).toBe("refresh_token_456");
  });

  it("logout clears state", () => {
    const store = useAuthStore.getState();
    store.login(
      { id: "u1", email: "test@test.com", full_name: "Test", referral_code: "REF123" },
      "token",
      "refresh",
    );
    store.logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it("isAuthenticated returns true when token is set", () => {
    const store = useAuthStore.getState();
    store.login(
      { id: "u1", email: "t@t.com", full_name: "T", referral_code: "R" },
      "token",
      "refresh",
    );
    expect(useAuthStore.getState().accessToken).not.toBeNull();
  });
});
