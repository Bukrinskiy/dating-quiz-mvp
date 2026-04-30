/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

type ThinkingContextValue = {
  track: <T>(operation: Promise<T>) => Promise<T>;
  busy: boolean;
};

const ThinkingContext = createContext<ThinkingContextValue | null>(null);

export function ThinkingProvider({ children }: PropsWithChildren) {
  const [count, setCount] = useState(0);

  const track = useCallback(async <T,>(operation: Promise<T>) => {
    setCount((current) => current + 1);
    try {
      return await operation;
    } finally {
      setCount((current) => Math.max(0, current - 1));
    }
  }, []);

  const value = useMemo(
    () => ({
      track,
      busy: count > 0,
    }),
    [count, track],
  );

  return (
    <ThinkingContext.Provider value={value}>
      {children}
    </ThinkingContext.Provider>
  );
}

export const useThinking = (): ThinkingContextValue => {
  const context = useContext(ThinkingContext);
  if (!context) {
    throw new Error("useThinking must be used inside ThinkingProvider");
  }
  return context;
};
