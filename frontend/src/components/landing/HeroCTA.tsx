type HeroCTAProps = {
  text: string;
  onClick: () => void;
};

export const HeroCTA = ({ text, onClick }: HeroCTAProps) => {
  return (
    <button type="button" className="hero__cta" onClick={onClick} data-hero-cta>
      {text}
    </button>
  );
};
