import type { SessionGeneratePayload, SessionMode } from "./types";

export const THEME_STORAGE_KEY = "flirto.app.theme";
export const ONBOARDING_STORAGE_KEY = "flirto.app.onboarded";
const RECENT_SESSIONS_STORAGE_KEY = "flirto.app.recent-sessions";
const ADVICE_TARGET_STORAGE_KEY = "flirto.app.advice-target";
const RECENT_SESSIONS_LIMIT = 10;

export type AppTheme = "light" | "dark";

export type RecentSessionRecord = {
  id: string;
  mode: SessionMode;
  createdAt: string;
  preview: string;
};

export function readTheme(): AppTheme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function writeTheme(theme: AppTheme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore local storage failures.
  }
}

export function readOnboardingDismissed(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeOnboardingDismissed() {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch {
    // Ignore local storage failures.
  }
}

export function readRecentSessions(): RecentSessionRecord[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SESSIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecentSessionRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => typeof item?.id === "string" && typeof item?.mode === "string");
  } catch {
    return [];
  }
}

export function resolveAdviceTabTarget() {
  try {
    const current = window.localStorage.getItem(ADVICE_TARGET_STORAGE_KEY);
    if (current && current.startsWith("/app")) {
      return current;
    }
  } catch {
    // Ignore local storage failures.
  }
  const [latest] = readRecentSessions();
  return latest ? `/app/session/${latest.id}?mode=${latest.mode}` : "/app";
}

export function rememberAdviceTabTarget(target: string) {
  try {
    window.localStorage.setItem(ADVICE_TARGET_STORAGE_KEY, target);
  } catch {
    // Ignore local storage failures.
  }
}

export function rememberRecentSession(sessionId: string, mode: SessionMode) {
  const current = readRecentSessions();
  const nextRecord: RecentSessionRecord = {
    id: sessionId,
    mode,
    createdAt: new Date().toISOString(),
    preview: "",
  };
  const next = [nextRecord, ...current.filter((item) => item.id !== sessionId)].slice(0, RECENT_SESSIONS_LIMIT);
  writeRecentSessions(next);
}

export function updateRecentSessionPreview(sessionId: string, payload: SessionGeneratePayload) {
  const preview = extractPreview(payload);
  if (!preview) {
    return;
  }
  const next = readRecentSessions().map((item) => (item.id === sessionId ? { ...item, preview } : item));
  writeRecentSessions(next);
}

function writeRecentSessions(value: RecentSessionRecord[]) {
  try {
    window.localStorage.setItem(RECENT_SESSIONS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore local storage failures.
  }
}

function extractPreview(payload: SessionGeneratePayload): string {
  const candidate =
    asString(payload.primary_message) ||
    asString(payload.diagnosis) ||
    asString(payload.message_template) ||
    asString(payload.next_step);
  return candidate ? candidate.slice(0, 180) : "";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
