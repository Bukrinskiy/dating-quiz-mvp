import type { ReactNode } from "react";

type LegalLayoutProps = {
  title: string;
  updated: string;
  intro?: string;
  children: ReactNode;
};

export const LegalLayout = ({ title, updated, intro, children }: LegalLayoutProps) => (
  <section className="legal-layout">
    <h1 className="legal-layout__title">{title}</h1>
    <p className="legal-layout__updated">{updated}</p>
    {intro ? <p className="legal-layout__intro">{intro}</p> : null}
    {children}
  </section>
);
