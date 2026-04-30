import { beforeEach, describe, expect, it, vi } from "vitest";

const createStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
  };
};

describe("pay tracking relay", () => {
  beforeEach(() => {
    vi.resetModules();

    const sessionStorage = createStorage();
    const localStorage = createStorage();
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));

    vi.stubGlobal("window", {
      __APP_CONFIG__: {
        API_BASE_URL: "https://api.flirto.guru",
      },
      location: {
        search: "?utm_source=meta&bcid=query-bcid",
        pathname: "/en/checkout/quiz-session-123",
      },
      sessionStorage,
      localStorage,
    });
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("document", {
      cookie: "",
    });
    vi.stubGlobal("navigator", {
      sendBeacon: vi.fn(() => false),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends pay events to backend relay and forwards merged tracking params", async () => {
    const { sendPostbackOnce } = await import("./tracking");

    sendPostbackOnce("transition_to_payment", "?utm_source=meta&bcid=query-bcid", {
      forceSend: true,
      sessionId: "quiz-session-123",
      trackingParams: { plan: "sub_monthly" },
    });

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.flirto.guru/api/events/mobi-slon");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      status: "transition_to_payment",
      clickid: "query-bcid",
      session_id: "quiz-session-123",
      page_path: "/en/checkout/quiz-session-123?utm_source=meta&bcid=query-bcid",
    });
    expect(body.tracking_params).toMatchObject({
      utm_source: "meta",
      bcid: "query-bcid",
      plan: "sub_monthly",
    });
  });
});
