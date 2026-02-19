import { HeroMedia } from "./HeroMedia";
import { HeroCTA } from "./HeroCTA";

type HeroSectionProps = {
  title: string;
  subtitle: string;
  list: string[];
  note: string;
  videoSrc: string;
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
  videoSrc,
  cta,
  microcopy,
  fallbackText,
  fallback,
  onCtaClick,
  onVideoError,
}: HeroSectionProps) => {
  const hasVideo = videoSrc.trim().length > 0;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title">{title}</h1>
      <div className={`hero__blocks ${hasVideo ? "" : "hero__blocks--no-media"}`}>
        <div className="hero__content">
          <p className="hero__subtitle">{subtitle}</p>
          <ul className="hero__list">
            {list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="hero__note">{note}</p>
        </div>
        {hasVideo ? (
          <HeroMedia videoSrc={videoSrc} fallbackText={fallbackText} fallback={fallback} onError={onVideoError} />
        ) : null}
      </div>
      <HeroCTA text={cta} onClick={onCtaClick} />
      <p className="hero__microcopy">{microcopy}</p>
    </section>
  );
};
