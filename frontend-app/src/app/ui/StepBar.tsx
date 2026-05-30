import { useI18n } from "../i18n";

export function StepBar({ step, inverted = false }: { step: 0 | 1 | 2 | 3; inverted?: boolean }) {
  const { messages } = useI18n();
  const steps = messages.session.stepLabels;

  return (
    <div className={`step-bar${inverted ? " step-bar--inverted" : ""}`} aria-hidden="true">
      {steps.map((label, index) => (
        <div className="step-bar__item" key={label}>
          <span className={index <= step ? "is-active" : ""} />
          <small className={index <= step ? "is-active" : ""}>{label}</small>
        </div>
      ))}
    </div>
  );
}
