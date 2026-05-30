export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type InstallPlatform = "ios" | "android" | "desktop";
export type InstallFlowOutcome = "accepted" | "dismissed" | "opened_share" | "manual" | "unavailable";

let deferredPrompt: DeferredInstallPrompt | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as DeferredInstallPrompt;
  });
}

export const isStandaloneDisplay = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches) || window.navigator.standalone === true;
};

export const getInstallPrompt = () => deferredPrompt;

export const consumeInstallPrompt = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
  if (!deferredPrompt) {
    return "unavailable";
  }
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome;
};

export const startInstallFlow = async ({
  title,
  text,
  url,
}: {
  title?: string;
  text?: string;
  url?: string;
} = {}): Promise<InstallFlowOutcome> => {
  const nativeOutcome = await consumeInstallPrompt();
  if (nativeOutcome !== "unavailable") {
    return nativeOutcome;
  }
  if (typeof window === "undefined") {
    return "unavailable";
  }
  if (getInstallPlatform() === "ios" && typeof window.navigator.share === "function") {
    try {
      await window.navigator.share({
        title,
        text,
        url: url ?? window.location.href,
      });
      return "opened_share";
    } catch {
      return "manual";
    }
  }
  return "manual";
};

export function detectInstallPlatform({
  userAgent,
  maxTouchPoints = 0,
  platform = "",
}: {
  userAgent: string;
  maxTouchPoints?: number;
  platform?: string;
}): InstallPlatform {
  if (/Android/i.test(userAgent)) {
    return "android";
  }
  if (/iPhone|iPad|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) {
    return "ios";
  }
  return "desktop";
}

export function getInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") {
    return "desktop";
  }
  return detectInstallPlatform({
    userAgent: window.navigator.userAgent,
    maxTouchPoints: window.navigator.maxTouchPoints,
    platform: window.navigator.platform,
  });
}
