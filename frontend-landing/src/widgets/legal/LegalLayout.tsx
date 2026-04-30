import type { PropsWithChildren } from "react";

type LegalLayoutProps = PropsWithChildren<{
  title: string;
  updated: string;
  intro?: string;
}>;

export const LegalLayout = ({ title, updated, intro, children }: LegalLayoutProps) => {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <h1 className="legal-title">{title}</h1>
        <p className="legal-updated">{updated}</p>
        {intro ? <p className="legal-text">{intro}</p> : null}
        {children}
      </article>
    </main>
  );
};
