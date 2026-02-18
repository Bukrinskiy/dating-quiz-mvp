import { LoopPanel } from "./LoopPanel";

type Block6ScreenTwoProps = {
  title: string;
  intro: string[];
  anchor: string;
  postAnchor: string;
  loop: string[];
  microcopy: string;
  cta: string;
  onFinish: () => void;
};

export const Block6ScreenTwo = ({
  title,
  intro,
  anchor,
  postAnchor,
  loop,
  microcopy,
  cta,
  onFinish,
}: Block6ScreenTwoProps) => {
  return (
    <article className="block6-screen is-active" aria-live="polite">
      <h1 className="block6__title">{title}</h1>
      <div className="block6-panel block6-panel--explanation">
        <div className="result-intro">
          {intro.map((text) => (
            <p key={text} className="block6__text">
              {text}
            </p>
          ))}
        </div>
        <p className="block6__text block6__text--anchor result-anchor">{anchor}</p>
        <p className="block6__text block6__text--post-anchor">{postAnchor}</p>
      </div>
      <LoopPanel items={loop} />
      <div className="block6-transition">
        <p className="result-micro">{microcopy}</p>
        <button type="button" className="btn" onClick={onFinish}>
          {cta}
        </button>
      </div>
    </article>
  );
};
