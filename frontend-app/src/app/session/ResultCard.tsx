import { asTextList } from "../api";
import { useI18n } from "../i18n";
import type { SessionGeneratePayload, SessionMode } from "../types";

export function ResultCard({ mode, payload }: { mode: SessionMode; payload: SessionGeneratePayload }) {
  const { messages } = useI18n();
  const emptyText = messages.session.cards.emptyList;

  if (mode === "write_now") {
    return (
      <section className="card-stack">
        <Section emptyText={emptyText} title={messages.session.cards.primaryMessage} value={String(payload.primary_message || "")} strong />
        <Section emptyText={emptyText} title={messages.session.cards.why} value={String(payload.why || "")} />
        <ListSection emptyText={emptyText} title={messages.session.cards.risks} items={asTextList(payload.risks)} />
        <ListSection emptyText={emptyText} title={messages.session.cards.avoid} items={asTextList(payload.avoid_list)} />
        <Section emptyText={emptyText} title={messages.session.cards.nextStep} value={String(payload.next_step || "")} />
        <Section emptyText={emptyText} title={messages.session.cards.simpleVersion} value={String(payload.fallback_simple_version || "")} />
        <ListSection emptyText={emptyText} title={messages.session.cards.alternatives} items={asTextList(payload.alternatives)} />
      </section>
    );
  }

  return (
    <section className="card-stack">
      <Section emptyText={emptyText} title={messages.session.cards.diagnosis} value={String(payload.diagnosis || "")} strong />
      <Section emptyText={emptyText} title={messages.session.cards.leverage} value={String(payload.core_leverage || "")} />
      <ListSection emptyText={emptyText} title={messages.session.cards.plan24} items={asTextList(payload.plan_24h)} />
      <ListSection emptyText={emptyText} title={messages.session.cards.ifReply} items={asTextList(payload.plan_if_reply)} />
      <ListSection emptyText={emptyText} title={messages.session.cards.ifNoReply} items={asTextList(payload.plan_if_no_reply)} />
      <Section emptyText={emptyText} title={messages.session.cards.template} value={String(payload.message_template || "")} />
      <ListSection emptyText={emptyText} title={messages.session.cards.avoid} items={asTextList(payload.avoid_list)} />
    </section>
  );
}

function Section({ title, value, emptyText, strong = false }: { title: string; value: string; emptyText: string; strong?: boolean }) {
  return (
    <article className={`detail-card${strong ? " detail-card--strong" : ""}`}>
      <span>{title}</span>
      <p>{value || emptyText}</p>
    </article>
  );
}

function ListSection({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <article className="detail-card">
      <span>{title}</span>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </article>
  );
}
