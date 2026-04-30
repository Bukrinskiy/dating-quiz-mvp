export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
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
