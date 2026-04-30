import { appCopy } from "../copy";
import type { SessionMessage } from "../types";
import { StepBar } from "../ui/StepBar";
import { buildConfirmSummaryItems, buildConfirmTimelineItems } from "./confirmStageFormat";

type ConfirmStageProps = {
  busy: boolean;
  messages: SessionMessage[];
  preview: string;
  onBack: () => void;
  onConfirm: () => Promise<void>;
  onEdit: () => void;
  readOnly?: boolean;
};

const sentAtFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatSentAt(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return sentAtFormatter.format(date);
}

export function ConfirmStage({ busy, messages, preview, onBack, onConfirm, onEdit, readOnly = false }: ConfirmStageProps) {
  const summaryItems = buildConfirmSummaryItems(preview);
  const timelineItems = buildConfirmTimelineItems(messages);
  const hasTimeline = timelineItems.length > 0;

  return (
    <section className="confirm-stage">
      <StepBar step={1} />
      <div className="page-heading confirm-stage__heading">
        <h1>{appCopy.session.confirmHeading}</h1>
        <p>{appCopy.session.confirmBody}</p>
      </div>
      <div className="confirm-stage__content">
        <section className="confirm-stage__timeline" aria-labelledby="confirm-context-title">
          <div className="confirm-stage__section-head">
            <span className="confirm-stage__eyebrow">Проверка перед генерацией</span>
            <h2 id="confirm-context-title">Контекст</h2>
            <p>{hasTimeline ? "Сверь, что порядок, авторы и формулировки совпадают с тем, что ты добавил." : "Проверь, что я правильно понял суть ситуации."}</p>
          </div>

          {hasTimeline ? (
            <div className="confirm-stage__timeline-list">
              {timelineItems.map((item) => (
                <article className="confirm-stage__timeline-item" key={item.id}>
                  <div className="confirm-stage__timeline-meta">
                    <strong>{item.author}</strong>
                    <span>{item.kindLabel}</span>
                    {item.sentAt ? <time dateTime={item.sentAt}>{formatSentAt(item.sentAt)}</time> : null}
                  </div>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          ) : summaryItems.length ? (
            <ul className="confirm-stage__summary-list">
              {summaryItems.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          ) : (
            <p className="confirm-stage__empty">Контекст выглядит пустым. Вернись и добавь детали.</p>
          )}
        </section>
      </div>

      <p className="confirm-stage__helper">Если что-то упущено, вернись и добавь.</p>

      <div className="confirm-stage__footer">
        <div className="confirm-stage__actions">
          <button className="button button--secondary button--lg button--full" disabled={readOnly} onClick={onEdit} type="button">
            {appCopy.session.confirmEdit}
          </button>
          <button className="button button--primary button--lg button--full" disabled={busy || readOnly} onClick={() => void onConfirm()} type="button">
            {appCopy.session.confirmYes}
          </button>
        </div>
      </div>
      <button className="confirm-stage__backlink" onClick={onBack} type="button">
        {appCopy.shell.back}
      </button>
    </section>
  );
}
