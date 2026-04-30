import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("frontend-app uses a single manifest source in index.html", () => {
  const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  expect(indexHtml).not.toContain("site.webmanifest");
});

test("android install icons are present in public assets", () => {
  const public192 = readFileSync(resolve(process.cwd(), "public/android-chrome-192x192.png"));
  const public512 = readFileSync(resolve(process.cwd(), "public/android-chrome-512x512.png"));

  expect(public192.byteLength).toBeGreaterThan(0);
  expect(public512.byteLength).toBeGreaterThan(0);
});
