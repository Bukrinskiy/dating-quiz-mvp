type ProxyVisualProps = {
  warnings: string[];
  checks: string[];
};

export const ProxyVisual = ({ warnings, checks }: ProxyVisualProps) => {
  return (
    <div className="hero__visual" aria-hidden="true">
      <div className="hero__stack">
        {warnings.map((item, idx) => (
          <div className={`hero__warning hero__warning--${idx + 1}`} key={item}>
            {item}
          </div>
        ))}
      </div>
      <div className="hero__card">
        <div className="hero__card-head">
          <span />
          <span />
          <span />
        </div>
        <ul className="hero__checks">
          {checks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
