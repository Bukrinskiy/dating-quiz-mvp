import { HeroMedia } from "./HeroMedia";
import { HeroCTA } from "./HeroCTA";

type HeroSectionProps = {
  title: string;
  subtitle: string;
  list: string[];
  note: string;
  cta: string;
  microcopy: string;
  fallbackText: string;
  fallback: boolean;
  onCtaClick: () => void;
  onVideoError: () => void;
};

export const HeroSection = ({
  title,
  subtitle,
  list,
  note,
  cta,
  microcopy,
  fallbackText,
  fallback,
  onCtaClick,
  onVideoError,
}: HeroSectionProps) => {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title">{title}</h1>
      <div className="hero__blocks">
        <div className="hero__content">
          <p className="hero__subtitle">{subtitle}</p>
          <ul className="hero__list">
            {list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="hero__note">{note}</p>
        </div>
        <HeroMedia fallbackText={fallbackText} fallback={fallback} onError={onVideoError} />
      </div>
      <HeroCTA text={cta} onClick={onCtaClick} />
      <p className="hero__microcopy">{microcopy}</p>
    </section>
  );
};
