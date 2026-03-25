import { HeroCTA } from "./HeroCTA";
import { ProxyVisual } from "./ProxyVisual";

type HeroSectionProps = {
  title: string;
  subtitle: string;
  list: string[];
  note: string;
  cta: string;
  microcopy: string;
  warnings: string[];
  checks: string[];
  onCtaClick: () => void;
};

export const HeroSection = ({
  title,
  subtitle,
  list,
  note,
  cta,
  microcopy,
  warnings,
  checks,
  onCtaClick,
}: HeroSectionProps) => {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__blocks">
        <ProxyVisual warnings={warnings} checks={checks} />
        <div className="hero__content">
          <h1 id="hero-title">{title}</h1>
          <p className="hero__subtitle">{subtitle}</p>
          <HeroCTA text={cta} onClick={onCtaClick} />
          <p className="hero__microcopy">{microcopy}</p>
          <ul className="hero__list" aria-label={note}>
            {list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="hero__note">{note}</p>
        </div>
      </div>
    </section>
  );
};
