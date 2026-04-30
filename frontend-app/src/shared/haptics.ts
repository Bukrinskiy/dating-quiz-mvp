type HapticTone = "send" | "confirm" | "error" | "soft";

const PATTERNS: Record<HapticTone, number | number[]> = {
  send: 16,
  confirm: [14, 28, 18],
  error: [24, 40, 24],
  soft: 10,
};

export const triggerHaptic = (tone: HapticTone) => {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  navigator.vibrate(PATTERNS[tone]);
};
