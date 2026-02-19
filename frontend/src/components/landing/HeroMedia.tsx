import { useState } from "react";

type HeroMediaProps = {
  videoSrc: string;
  fallbackText: string;
  fallback: boolean;
  onError: () => void;
};

export const HeroMedia = ({ videoSrc, fallbackText, fallback, onError }: HeroMediaProps) => {
  const [loading, setLoading] = useState(true);

  const handleError = () => {
    setLoading(false);
    onError();
  };

  return (
    <div className={`hero__media ${fallback ? "is-fallback" : ""}`}>
      <video
        className="hero__video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onCanPlay={() => setLoading(false)}
        onError={handleError}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      {loading && !fallback ? <div className="hero__loader" aria-hidden="true" /> : null}
      <div className="hero__fallback" aria-hidden="true">
        {fallbackText}
      </div>
    </div>
  );
};
