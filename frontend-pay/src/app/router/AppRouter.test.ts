import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("pay pixel sources", () => {
  it("does not include direct Mobi-Slon or Meta pixel bootstrap in pay html", () => {
    const htmlPath = fileURLToPath(new URL("../../../index.html", import.meta.url));
    const html = readFileSync(htmlPath, "utf8");

    expect(html).not.toContain("BPixelJS");
    expect(html).not.toContain("connect.facebook.net");
    expect(html).not.toContain("facebook.com/tr?id=");
  });

  it("does not track Meta pageviews on pay route changes", () => {
    const routerPath = fileURLToPath(new URL("./AppRouter.tsx", import.meta.url));
    const source = readFileSync(routerPath, "utf8");

    expect(source).not.toContain("fbq(");
    expect(source).not.toContain("window as Window & { fbq");
    expect(source).not.toContain('"facebook"');
  });
});
