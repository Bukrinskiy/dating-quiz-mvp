import { useEffect, useState } from "react";

import { StepBar } from "../ui/StepBar";
import { PrototypeIcon } from "../ui/icons";

type GenerateStageProps = {
  active: boolean;
};

const HINTS = ["Анализирую контекст…", "Формулирую совет…", "Почти готово…"];

export function GenerateStage({ active }: GenerateStageProps) {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setInterval(() => {
      setHintIndex((current) => Math.min(HINTS.length - 1, current + 1));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <section className="generate-stage" role="status" aria-live="polite">
      <div className="generate-stage__orb" />
      <div className="generate-stage__content">
        <div className="generate-stage__icon">
          <PrototypeIcon.sparkle />
        </div>
        <h1>Собираю совет</h1>
        <span aria-hidden="true" className="generate-stage__spinner" />
        <p>{HINTS[hintIndex]}</p>
        <StepBar inverted step={2} />
      </div>
    </section>
  );
}
