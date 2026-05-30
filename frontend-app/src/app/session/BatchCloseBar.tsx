import { useI18n } from "../i18n";

type BatchCloseBarProps = {
  busy: boolean;
  count: number;
  onDone: () => void;
};

export function BatchCloseBar({ busy, count, onDone }: BatchCloseBarProps) {
  const { messages } = useI18n();
  const label = count === 1 ? messages.session.fragmentOne : count < 5 ? messages.session.fragmentFew : messages.session.fragmentMany;

  return (
    <div className="batch-close-bar">
      <div className="batch-close-bar__summary">
        <strong>
          {count} {label}
        </strong>
        <span>{messages.session.readyForAnalysis}</span>
      </div>
      <button className="button button--primary button--sm" disabled={busy} onClick={onDone} type="button">
        {messages.session.batchClose}
      </button>
    </div>
  );
}
