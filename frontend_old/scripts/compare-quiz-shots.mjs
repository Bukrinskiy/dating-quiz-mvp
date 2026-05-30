import fs from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SHOTS_ROOT = path.resolve(ROOT, "../docs/quiz-parity-shots");
const DIFF_ROOT = path.join(SHOTS_ROOT, "diff");
const VIEWPORTS = ["mobile", "desktop"];
const NAMES = [
  ...Array.from({ length: 26 }, (_, i) => `q${String(i + 1).padStart(2, "0")}`),
  "email",
  "checkout-main",
  "checkout-popup",
];

const parseCsvArg = (name) => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return null;
  return raw
    .slice(prefix.length)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const readPng = async (filePath) => PNG.sync.read(await fs.readFile(filePath));

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const cropTopLeft = (png, width, height) => {
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcIdx = (png.width * y + x) << 2;
      const dstIdx = (width * y + x) << 2;
      out.data[dstIdx] = png.data[srcIdx];
      out.data[dstIdx + 1] = png.data[srcIdx + 1];
      out.data[dstIdx + 2] = png.data[srcIdx + 2];
      out.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }
  return out;
};

const comparePair = async (viewport, name) => {
  const localPath = path.join(SHOTS_ROOT, viewport, "local", `${name}.png`);
  const sourcePath = path.join(SHOTS_ROOT, viewport, "source", `${name}.png`);
  const diffDir = path.join(DIFF_ROOT, viewport);
  const diffPath = path.join(diffDir, `${name}.png`);
  await ensureDir(diffDir);

  const [local, source] = await Promise.all([readPng(localPath), readPng(sourcePath)]);
  const width = Math.min(local.width, source.width);
  const height = Math.min(local.height, source.height);
  const localCrop = cropTopLeft(local, width, height);
  const sourceCrop = cropTopLeft(source, width, height);

  const diff = new PNG({ width, height });
  const pixels = pixelmatch(localCrop.data, sourceCrop.data, diff.data, width, height, {
    threshold: 0.1,
    includeAA: true,
    alpha: 0.5,
  });
  await fs.writeFile(diffPath, PNG.sync.write(diff));
  const total = width * height;
  const ratio = pixels / total;
  return { viewport, name, pixels, total, ratio, diffPath };
};

const run = async () => {
  const selectedViewports = parseCsvArg("viewports") ?? VIEWPORTS;
  const selectedNames = parseCsvArg("names") ?? NAMES;
  const rows = [];
  for (const viewport of selectedViewports) {
    for (const name of selectedNames) {
      rows.push(await comparePair(viewport, name));
    }
  }

  rows.sort((a, b) => b.ratio - a.ratio);

  const header = "viewport,name,diff_pixels,total_pixels,diff_ratio\n";
  const csv = rows
    .map((r) => `${r.viewport},${r.name},${r.pixels},${r.total},${r.ratio.toFixed(6)}`)
    .join("\n");
  const reportPath = path.join(DIFF_ROOT, "report.csv");
  await fs.writeFile(reportPath, header + csv + "\n", "utf8");

  const top = rows.slice(0, 20);
  // eslint-disable-next-line no-console
  console.log("Top mismatches:");
  for (const row of top) {
    // eslint-disable-next-line no-console
    console.log(`${row.viewport}/${row.name}: ${(row.ratio * 100).toFixed(2)}%`);
  }
  // eslint-disable-next-line no-console
  console.log(`\nFull report: ${reportPath}`);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
