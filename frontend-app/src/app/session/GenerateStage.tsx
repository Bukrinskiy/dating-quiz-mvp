import { useEffect, useState } from "react";

import { useI18n } from "../i18n";
import { StepBar } from "../ui/StepBar";
import { PrototypeIcon } from "../ui/icons";

type GenerateStageProps = {
  active: boolean;
};

export function GenerateStage({ active }: GenerateStageProps) {
  const { messages } = useI18n();
  const [hintIndex, setHintIndex] = useState(0);
  const hints = [messages.session.thinking, messages.session.generateHintMid, messages.session.generateHintLate];

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setInterval(() => {
      setHintIndex((current) => Math.min(2, current + 1));
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
        <h1>{messages.session.generateTitle}</h1>
        <span aria-hidden="true" className="generate-stage__spinner" />
        <p>{hints[hintIndex]}</p>
        <StepBar inverted step={2} />
      </div>
    </section>
  );
}
