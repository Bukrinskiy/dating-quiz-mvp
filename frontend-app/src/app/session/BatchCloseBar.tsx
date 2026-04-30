import { appCopy } from "../copy";

type BatchCloseBarProps = {
  busy: boolean;
  count: number;
  onDone: () => void;
};

export function BatchCloseBar({ busy, count, onDone }: BatchCloseBarProps) {
  const label = count === 1 ? "фрагмент" : count < 5 ? "фрагмента" : "фрагментов";

  return (
    <div className="batch-close-bar">
      <div className="batch-close-bar__summary">
        <strong>
          {count} {label}
        </strong>
        <span>Готово к разбору</span>
      </div>
      <button className="button button--primary button--sm" disabled={busy} onClick={onDone} type="button">
        {appCopy.session.batchClose}
      </button>
    </div>
  );
}
