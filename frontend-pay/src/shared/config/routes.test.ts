import { describe, expect, it } from "vitest";
import { canonicalQuizLang, payRoutes } from "./routes";

describe("payRoutes", () => {
  it("builds canonical pay surface routes", () => {
    expect(payRoutes.checkout("en", "session-123")).toBe("/en/checkout/session-123");
    expect(payRoutes.success("en")).toBe("/en/pay/success");
    expect(payRoutes.cancel()).toBe("/en/pay/cancel");
    expect(payRoutes.manage()).toBe("/en/pay/manage");
  });

  it("keeps a legacy checkout helper for redirects only", () => {
    expect(payRoutes.legacyCheckout("en", "session-123")).toBe("/en/quiz/checkout/session-123");
  });

  it("canonicalizes any non-English lang to English", () => {
    expect(canonicalQuizLang("en")).toBe("en");
    expect(canonicalQuizLang("ru")).toBe("en");
    expect(canonicalQuizLang(undefined)).toBe("en");
  });
});
