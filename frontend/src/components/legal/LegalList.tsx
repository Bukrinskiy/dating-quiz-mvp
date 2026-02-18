type LegalListProps = {
  items: string[];
};

export const LegalList = ({ items }: LegalListProps) => {
  return (
    <ul className="legal-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
};
