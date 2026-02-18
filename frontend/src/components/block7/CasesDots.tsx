type CasesDotsProps = {
  pages: number;
  activeIndex: number;
  onSelect: (index: number) => void;
};

export const CasesDots = ({ pages, activeIndex, onSelect }: CasesDotsProps) => {
  return (
    <div className="block7-cases-dots" aria-label="Case slider navigation">
      {Array.from({ length: pages }, (_, index) => (
        <button
          key={index}
          type="button"
          className={`block7-cases-dot ${index === activeIndex ? "is-active" : ""}`}
          aria-label={`Show cases slide ${index + 1}`}
          aria-current={index === activeIndex ? "true" : "false"}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
};
