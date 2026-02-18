import { enMessages } from "./en";
import { ruMessages } from "./ru";
import type { AppMessages, Locale } from "./types";

const getObjectPaths = (value: unknown, path = ""): string[] => {
  if (value === null || typeof value !== "object") {
    return [path];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [path];
    }
    return value.flatMap((item, index) => getObjectPaths(item, `${path}[${index}]`));
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return entries.flatMap(([key, entry]) => getObjectPaths(entry, path ? `${path}.${key}` : key));
};

const assertParity = (ru: AppMessages, en: AppMessages): void => {
  const ruPaths = getObjectPaths(ru).sort();
  const enPaths = getObjectPaths(en).sort();

  const missingInEn = ruPaths.filter((path) => !enPaths.includes(path));
  const missingInRu = enPaths.filter((path) => !ruPaths.includes(path));

  if (missingInEn.length > 0 || missingInRu.length > 0) {
    throw new Error(
      [
        "i18n parity check failed",
        missingInEn.length ? `Missing in EN: ${missingInEn.join(", ")}` : "",
        missingInRu.length ? `Missing in RU: ${missingInRu.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
};

assertParity(ruMessages, enMessages);

export const messages: Record<Locale, AppMessages> = {
  ru: ruMessages,
  en: enMessages,
};

export type { AppMessages, Locale, LegalDocument, LegalSection } from "./types";
