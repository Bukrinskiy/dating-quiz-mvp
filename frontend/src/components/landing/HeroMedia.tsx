type HeroMediaProps = {
  fallbackText: string;
  fallback: boolean;
  onError: () => void;
};

export const HeroMedia = ({ fallbackText, fallback, onError }: HeroMediaProps) => {
  return (
    <div className={`hero__media ${fallback ? "is-fallback" : ""}`}>
      <video
        className="hero__video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/assets/hero-poster.jpg"
        onError={onError}
      >
        <source src="/assets/hero-remotion.webm" type="video/webm" />
        <source src="/assets/hero-remotion.mp4" type="video/mp4" />
        <source src="/assets/hero.mp4" type="video/mp4" />
      </video>
      <div className="hero__fallback" aria-hidden="true">
        {fallbackText}
      </div>
    </div>
  );
};
