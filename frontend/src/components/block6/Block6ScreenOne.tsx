import { TimelineList } from "./TimelineList";

type Block6ScreenOneProps = {
  title: string;
  paragraphs: string[];
  timeline: string[];
  cta: string;
  onNext: () => void;
};

export const Block6ScreenOne = ({ title, paragraphs, timeline, cta, onNext }: Block6ScreenOneProps) => {
  return (
    <article className="block6-screen is-active" aria-live="polite">
      <h1 className="block6__title">{title}</h1>
      {paragraphs.map((text) => (
        <p key={text} className="block6__text">
          {text}
        </p>
      ))}
      <TimelineList items={timeline} />
      <button type="button" className="btn" onClick={onNext}>
        {cta}
      </button>
    </article>
  );
};
