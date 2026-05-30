import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("SuccessPage app handoff", () => {
  it("uses access_link for the paid CTA instead of the Telegram activation link", () => {
    const pagePath = fileURLToPath(new URL("./SuccessPage.tsx", import.meta.url));
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain("payload.access_link");
    expect(source).toContain("status?.access_link");
    expect(source).toContain("copy.ui.payPendingTitle");
    expect(source).toContain("!isPendingStatus");
    expect(source).toContain('reachYandexMetrikaGoal("open_app")');
    expect(source).toContain('className="source-success__spinner"');
    expect(source).not.toContain('className="source-success__action-spinner"');
    expect(source).not.toContain("@radix-ui/themes");
    expect(source).not.toContain("status?.activation_link");
    expect(source).not.toContain('reachYandexMetrikaGoal("open_bot")');
  });
});
