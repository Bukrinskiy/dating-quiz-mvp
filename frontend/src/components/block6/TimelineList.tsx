type TimelineListProps = {
  items: string[];
};

const icons = ["✉", "?", "🕒", "💬", "↔", "↺"];

export const TimelineList = ({ items }: TimelineListProps) => {
  return (
    <ul className="block6-anchors result-timeline" aria-label="Key states">
      {items.map((item, index) => (
        <li key={item} className="block6-anchor timeline-item">
          <span className="timeline-icon-wrap" aria-hidden="true">
            <span className="timeline-icon">{icons[index] ?? "•"}</span>
            {index < items.length - 1 ? <span className="timeline-line" /> : null}
          </span>
          <span className="timeline-text">{item}</span>
        </li>
      ))}
    </ul>
  );
};
