import { useI18n } from "../i18n";
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

function formatSentAt(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(document.documentElement.lang === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ConfirmStage({ busy, messages, preview, onBack, onConfirm, onEdit, readOnly = false }: ConfirmStageProps) {
  const { messages: i18nMessages, roleLabels } = useI18n();
  const summaryItems = buildConfirmSummaryItems(preview);
  const timelineItems = buildConfirmTimelineItems(messages, i18nMessages, roleLabels);
  const hasTimeline = timelineItems.length > 0;

  return (
    <section className="confirm-stage">
      <StepBar step={1} />
      <div className="page-heading confirm-stage__heading">
        <h1>{i18nMessages.session.confirmHeading}</h1>
        <p>{i18nMessages.session.confirmBody}</p>
      </div>
      <div className="confirm-stage__content">
        <section className="confirm-stage__timeline" aria-labelledby="confirm-context-title">
          <div className="confirm-stage__section-head">
            <span className="confirm-stage__eyebrow">{i18nMessages.session.confirmEyebrow}</span>
            <h2 id="confirm-context-title">{i18nMessages.session.confirmContextTitle}</h2>
            <p>{hasTimeline ? i18nMessages.session.confirmTimelineBody : i18nMessages.session.confirmSimpleBody}</p>
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
            <p className="confirm-stage__empty">{i18nMessages.session.confirmEmpty}</p>
          )}
        </section>
      </div>

      <p className="confirm-stage__helper">{i18nMessages.session.confirmHelper}</p>

      <div className="confirm-stage__footer">
        <div className="confirm-stage__actions">
          <button className="button button--secondary button--lg button--full" disabled={readOnly} onClick={onEdit} type="button">
            {i18nMessages.session.confirmEdit}
          </button>
          <button className="button button--primary button--lg button--full" disabled={busy || readOnly} onClick={() => void onConfirm()} type="button">
            {i18nMessages.session.confirmYes}
          </button>
        </div>
      </div>
      <button className="confirm-stage__backlink" onClick={onBack} type="button">
        {i18nMessages.shell.back}
      </button>
    </section>
  );
}
