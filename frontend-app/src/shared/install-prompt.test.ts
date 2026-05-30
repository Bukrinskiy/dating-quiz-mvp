import { beforeEach, describe, expect, test, vi } from "vitest";

import { detectInstallPlatform, getInstallPrompt, startInstallFlow } from "./install-prompt";

beforeEach(() => {
  Object.defineProperty(window.navigator, "share", {
    configurable: true,
    value: undefined,
  });
});

describe("detectInstallPlatform", () => {
  test("detects iPhone and iPad user agents as iOS", () => {
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" })).toBe("ios");
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" })).toBe("ios");
  });

  test("detects iPadOS desktop user agent as iOS when touch is available", () => {
    expect(
      detectInstallPlatform({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe("ios");
  });

  test("detects Android user agents", () => {
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)" })).toBe("android");
  });

  test("falls back to desktop", () => {
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel" })).toBe("desktop");
  });
});

describe("startInstallFlow", () => {
  test("uses native install prompt when available", async () => {
    const prompt = vi.fn(async () => undefined);
    const event = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
    window.dispatchEvent(event);

    await expect(startInstallFlow()).resolves.toBe("accepted");
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(getInstallPrompt()).toBeNull();
  });

  test("opens iOS share sheet when native prompt is unavailable", async () => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "iPhone",
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
    const share = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: share,
    });

    await expect(startInstallFlow({ title: "Flirto Guru" })).resolves.toBe("opened_share");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "Flirto Guru" }));
  });

  test("falls back to manual instruction when no install API is available", async () => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "MacIntel",
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: 0,
    });

    await expect(startInstallFlow()).resolves.toBe("manual");
  });
});
