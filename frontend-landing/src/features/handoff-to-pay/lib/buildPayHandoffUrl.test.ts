import { describe, expect, it, vi } from "vitest";
import { buildPayHandoffUrl } from "./buildPayHandoffUrl";
import type { LandingManifest } from "../../../entities/landing-manifest";

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

vi.stubGlobal("window", {
  __APP_CONFIG__: {
    PAY_PUBLIC_BASE_URL: "https://pay.flirto.guru",
  },
  location: {
    origin: "https://lp1.flirto.guru",
    host: "lp1.flirto.guru",
    pathname: "/en/email/quiz-session-123",
  },
  sessionStorage: createStorage(),
});
vi.stubGlobal("sessionStorage", window.sessionStorage);
vi.stubGlobal("document", {
  cookie: "",
});

const manifest: LandingManifest = {
  landing_id: "lp1",
  host: "lp1.flirto.guru",
  default_locale: "en",
  experience_type: "quiz",
  enabled_routes: ["quiz", "email", "legal"],
  theme: "affemity-funnel",
  copy_set: "affemity-v1",
  asset_set: "affemity-funnel",
  payment_handoff_mode: "redirect_to_pay",
};

describe("buildPayHandoffUrl", () => {
  it("preserves attribution params and injects canonical session contract", () => {
    const url = new URL(buildPayHandoffUrl({
      lang: "en",
      sessionId: "quiz-session-123",
      manifest,
      search: "?clickid=abc123&utm_source=meta",
    }));

    expect(url.origin).toBe("https://pay.flirto.guru");
    expect(url.pathname).toBe("/en/checkout/quiz-session-123");
    expect(url.searchParams.get("clickid")).toBe("abc123");
    expect(url.searchParams.get("utm_source")).toBe("meta");
    expect(url.searchParams.get("session_id")).toBe("quiz-session-123");
    expect(url.searchParams.get("landing_id")).toBe("lp1");
    expect(url.searchParams.get("entry_host")).toBe("lp1.flirto.guru");
    expect(url.searchParams.get("entry_path")).toBe("/en/email/quiz-session-123");
    expect(url.searchParams.get("lang")).toBe("en");
  });

  it("preserves attribution params and injects session contract", () => {
    window.sessionStorage.clear();
    document.cookie = "clickid=from-cookie; bcid=from-bcookie";

    const url = new URL(buildPayHandoffUrl({
      lang: "en",
      sessionId: "quiz-session-123",
      manifest,
      search: "?utm_source=meta&landing_id=wrong&entry_host=wrong.example&entry_path=%2Fold&lang=ru",
    }));

    expect(url.searchParams.get("clickid")).toBe("from-cookie");
    expect(url.searchParams.get("bcid")).toBe("from-bcookie");
    expect(url.searchParams.get("utm_source")).toBe("meta");
    expect(url.searchParams.get("session_id")).toBe("quiz-session-123");
    expect(url.searchParams.get("landing_id")).toBe("lp1");
    expect(url.searchParams.get("entry_host")).toBe("lp1.flirto.guru");
    expect(url.searchParams.get("entry_path")).toBe("/en/email/quiz-session-123");
    expect(url.searchParams.get("lang")).toBe("en");
  });
});
