import { describe, it, expect, beforeEach } from "@jest/globals";
import { useAdminStore } from "@/lib/store/adminStore";

describe("adminStore", () => {
  beforeEach(() => {
    useAdminStore.setState({ admin: null, accessToken: null });
  });

  it("initial state is unauthenticated", () => {
    const state = useAdminStore.getState();
    expect(state.admin).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it("login sets admin and token", () => {
    useAdminStore.getState().login(
      { id: "a1", email: "admin@test.com", full_name: "Admin" },
      "admin_token_abc",
      "refresh_token_xyz",
    );
    const state = useAdminStore.getState();
    expect(state.admin?.email).toBe("admin@test.com");
    expect(state.accessToken).toBe("admin_token_abc");
  });

  it("logout clears state", () => {
    useAdminStore.getState().login(
      { id: "a1", email: "admin@test.com", full_name: "Admin" },
      "token",
      "refresh",
    );
    useAdminStore.getState().logout();
    expect(useAdminStore.getState().admin).toBeNull();
    expect(useAdminStore.getState().accessToken).toBeNull();
  });
});
