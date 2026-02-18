type LoopPanelProps = {
  items: string[];
};

export const LoopPanel = ({ items }: LoopPanelProps) => {
  return (
    <div className="block6-loop" aria-label="Loop Summary">
      <span className="block6-loop__icon" aria-hidden="true">
        ↺
      </span>
      <div className="block6-loop__items" aria-label="Why it is hard to fix alone">
        {items.map((item) => (
          <div key={item} className="block6-loop__item">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};
