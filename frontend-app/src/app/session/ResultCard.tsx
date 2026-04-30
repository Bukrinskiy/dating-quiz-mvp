import { asTextList } from "../api";
import { appCopy } from "../copy";
import type { SessionGeneratePayload, SessionMode } from "../types";

export function ResultCard({ mode, payload }: { mode: SessionMode; payload: SessionGeneratePayload }) {
  if (mode === "write_now") {
    return (
      <section className="card-stack">
        <Section title={appCopy.session.cards.primaryMessage} value={String(payload.primary_message || "")} strong />
        <Section title={appCopy.session.cards.why} value={String(payload.why || "")} />
        <ListSection title={appCopy.session.cards.risks} items={asTextList(payload.risks)} />
        <ListSection title={appCopy.session.cards.avoid} items={asTextList(payload.avoid_list)} />
        <Section title={appCopy.session.cards.nextStep} value={String(payload.next_step || "")} />
        <Section title={appCopy.session.cards.simpleVersion} value={String(payload.fallback_simple_version || "")} />
        <ListSection title={appCopy.session.cards.alternatives} items={asTextList(payload.alternatives)} />
      </section>
    );
  }

  return (
    <section className="card-stack">
      <Section title={appCopy.session.cards.diagnosis} value={String(payload.diagnosis || "")} strong />
      <Section title={appCopy.session.cards.leverage} value={String(payload.core_leverage || "")} />
      <ListSection title={appCopy.session.cards.plan24} items={asTextList(payload.plan_24h)} />
      <ListSection title={appCopy.session.cards.ifReply} items={asTextList(payload.plan_if_reply)} />
      <ListSection title={appCopy.session.cards.ifNoReply} items={asTextList(payload.plan_if_no_reply)} />
      <Section title={appCopy.session.cards.template} value={String(payload.message_template || "")} />
      <ListSection title={appCopy.session.cards.avoid} items={asTextList(payload.avoid_list)} />
    </section>
  );
}

function Section({ title, value, strong = false }: { title: string; value: string; strong?: boolean }) {
  return (
    <article className={`detail-card${strong ? " detail-card--strong" : ""}`}>
      <span>{title}</span>
      <p>{value || appCopy.session.cards.emptyList}</p>
    </article>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
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
        <p>{appCopy.session.cards.emptyList}</p>
      )}
    </article>
  );
}
