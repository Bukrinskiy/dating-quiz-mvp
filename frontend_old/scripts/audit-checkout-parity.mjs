import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DEFAULT_SOURCE_JS = "/tmp/flirt_checkout.js";
const DEFAULT_LOCAL_TSX = path.join(ROOT, "src/pages/QuizCheckoutPage.tsx");
const DEFAULT_LOCAL_CSS = path.join(ROOT, "src/styles/components/new-pay.css");
const DEFAULT_OUT = path.resolve(ROOT, "../docs/quiz-parity-shots/checkout-code-style-audit.md");

const arg = (name, fallback) => {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
};

const normalize = (value) => value.replace(/\s+/g, " ").trim();

const uniqueSorted = (items) => Array.from(new Set(items)).sort((a, b) => a.localeCompare(b, "ru"));

const sliceCheckoutPart = (source) => {
  const marker = "Ваш персональный AI-ассистент по знакомствам";
  const idx = source.indexOf(marker);
  if (idx < 0) return source;
  const start = Math.max(0, idx - 25000);
  const end = Math.min(source.length, idx + 65000);
  return source.slice(start, end);
};

const extractRuPhrases = (text) => {
  const phrases = [];
  const regex = /"([^"\n\r]*[А-Яа-яЁё][^"\n\r]*)"/g;
  let match = regex.exec(text);
  while (match) {
    const raw = normalize(match[1]);
    if (raw.length >= 10 && /[А-Яа-яЁё]/.test(raw)) {
      phrases.push(raw);
    }
    match = regex.exec(text);
  }
  return uniqueSorted(phrases);
};

const extractCheckoutAssets = (text) =>
  uniqueSorted(
    [
      ...(text.match(/\/(?:icons|images)\/checkout\/affemity-funnel-checkout\/[^"'`\s)]+/g) || []),
      ...(text.match(/\/icons\/faq-(?:opened|closed)\.svg/g) || []),
      ...(text.match(/\/icons\/checkout-close\.svg/g) || []),
    ],
  );

const extractSourceStyleValues = (text) => {
  const colors = uniqueSorted(text.match(/#[0-9a-fA-F]{3,8}/g) || []);
  const bracketValues = uniqueSorted((text.match(/-\[[^\]]+\]/g) || []).map((entry) => entry.slice(2, -1).trim()));
  return { colors, bracketValues };
};

const extractLocalStyleValues = (css) => {
  const colors = uniqueSorted(css.match(/#[0-9a-fA-F]{3,8}/g) || []);
  const values = uniqueSorted((css.match(/:\s*([^;{}]+);/g) || []).map((entry) => normalize(entry.replace(/^:\s*/, "").replace(/;$/, ""))));
  const atoms = [];
  for (const value of values) {
    for (const part of value.split(/\s+/)) {
      const token = part.trim().replace(/,$/, "");
      if (!token) continue;
      atoms.push(token);
    }
  }
  return { colors, atoms: uniqueSorted(atoms) };
};

const section = (title, lines) => {
  const body = lines.length > 0 ? lines.join("\n") : "_none_";
  return `## ${title}\n${body}\n`;
};

const run = async () => {
  const sourceJsPath = arg("source-js", DEFAULT_SOURCE_JS);
  const localTsxPath = arg("local-tsx", DEFAULT_LOCAL_TSX);
  const localCssPath = arg("local-css", DEFAULT_LOCAL_CSS);
  const outPath = arg("out", DEFAULT_OUT);

  const [sourceRaw, localTsxRaw, localCssRaw] = await Promise.all([
    fs.readFile(sourceJsPath, "utf8"),
    fs.readFile(localTsxPath, "utf8"),
    fs.readFile(localCssPath, "utf8"),
  ]);

  const source = sliceCheckoutPart(sourceRaw);
  const localJoined = `${localTsxRaw}\n${localCssRaw}`;

  const sourcePhrases = extractRuPhrases(source);
  const localPhrases = extractRuPhrases(localJoined);
  const missingPhrases = sourcePhrases.filter((phrase) => !localPhrases.includes(phrase));

  const sourceAssets = extractCheckoutAssets(source);
  const localAssets = extractCheckoutAssets(localJoined);
  const missingAssets = sourceAssets.filter((asset) => !localAssets.includes(asset));

  const sourceStyles = extractSourceStyleValues(source);
  const localStyles = extractLocalStyleValues(localCssRaw);
  const missingColors = sourceStyles.colors.filter((color) => !localStyles.colors.includes(color));
  const missingBracketValues = sourceStyles.bracketValues.filter((value) => !localStyles.atoms.includes(value));

  const report = [
    "# Checkout Code/Style Parity Audit",
    "",
    `- Source JS: \`${sourceJsPath}\``,
    `- Local TSX: \`${localTsxPath}\``,
    `- Local CSS: \`${localCssPath}\``,
    "",
    section(
      "Summary",
      [
        `- Missing RU phrases: **${missingPhrases.length}**`,
        `- Missing checkout assets: **${missingAssets.length}**`,
        `- Missing source colors in local CSS: **${missingColors.length}**`,
        `- Missing source bracket values in local CSS atoms: **${missingBracketValues.length}**`,
      ],
    ),
    section("Missing RU Phrases", missingPhrases.map((item) => `- ${item}`)),
    section("Missing Asset Paths", missingAssets.map((item) => `- \`${item}\``)),
    section("Missing Color Tokens", missingColors.map((item) => `- \`${item}\``)),
    section("Missing Bracket Values", missingBracketValues.map((item) => `- \`${item}\``)),
  ].join("\n");

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, report, "utf8");

  console.log(`Audit report saved to: ${outPath}`);
  console.log(`Missing phrases: ${missingPhrases.length}`);
  console.log(`Missing assets: ${missingAssets.length}`);
  console.log(`Missing colors: ${missingColors.length}`);
  console.log(`Missing bracket values: ${missingBracketValues.length}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

