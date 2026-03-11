import { logTracking } from "./trackingLogger";

const COUNTER_ID_PATTERN = /^[1-9]\d*$/;

const resolveCounterId = (): number | null => {
  const runtimeValue = window.__APP_CONFIG__?.VITE_YANDEX_METRIKA_ID?.trim();
  const buildValue = import.meta.env.VITE_YANDEX_METRIKA_ID?.trim();
  const rawValue = runtimeValue || buildValue || "";
  if (!COUNTER_ID_PATTERN.test(rawValue)) {
    return null;
  }
  return Number(rawValue);
};

const withMetrika = (action: (counterId: number, ym: NonNullable<Window["ym"]>) => void): void => {
  const counterId = resolveCounterId();
  if (!counterId) {
    return;
  }
  const ym = window.ym;
  if (typeof ym !== "function") {
    logTracking("yandex-metrika", "ym is not available", { counterId }, "warn");
    return;
  }
  action(counterId, ym);
};

export const hitYandexMetrikaPage = (path: string): void => {
  withMetrika((counterId, ym) => {
    ym(counterId, "hit", path);
    logTracking("yandex-metrika", "hit sent", { counterId, path });
  });
};

export const reachYandexMetrikaGoal = (goal: string): void => {
  withMetrika((counterId, ym) => {
    ym(counterId, "reachGoal", goal);
    logTracking("yandex-metrika", "reachGoal sent", { counterId, goal });
  });
};
