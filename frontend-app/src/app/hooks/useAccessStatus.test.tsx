import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { createAppApi } from "../api";
import { AccessStatusProvider, useAccessStatus } from "./useAccessStatus";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    createAppApi: vi.fn(),
  };
});

const mockedCreateAppApi = vi.mocked(createAppApi);

test("useAccessStatus refreshes and exposes latest state", async () => {
  const accessStatus = vi.fn(async () => ({ has_access: true, access_status: "grace_period", plan: "sub_monthly" }));
  mockedCreateAppApi.mockReturnValue({
    accessStatus,
  } as ReturnType<typeof createAppApi>);

  const authApi = {
    auth: {
      user: { id: "1", email: "u@example.com", locale: "ru" },
      tokens: { access_token: "token", expires_in: 10 },
      access: { has_access: true, access_status: "active" },
    },
    setAuth: vi.fn(),
    refreshAuth: vi.fn(),
    logout: vi.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => <AccessStatusProvider authApi={authApi}>{children}</AccessStatusProvider>;
  const { result } = renderHook(() => useAccessStatus(), { wrapper });

  await waitFor(() => expect(result.current.status?.access_status).toBe("grace_period"));
  expect(authApi.setAuth).toHaveBeenCalled();
});
