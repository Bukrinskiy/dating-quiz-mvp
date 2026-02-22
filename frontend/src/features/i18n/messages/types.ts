export type Locale = "ru" | "en";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
  email?: string;
  children?: LegalSection[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
};

export type QuizQuestionContent = {
  title: string;
  options: string[];
};

export type QuizBlockContent = {
  intro: string;
  questions: QuizQuestionContent[];
  microcopy: string;
};

export type CaseReview = {
  name: string;
  text: string;
  image: string;
  imageAlt: string;
};

export type AppMessages = {
  ui: {
    langRu: string;
    langEn: string;
    continue: string;
    questionLabel: string;
    payWait: string;
    payError: string;
    payUnavailable: string;
    payEmailLabel: string;
    payEmailPlaceholder: string;
    payModeOneTime: string;
    payModeSubscription: string;
    payStart: string;
    payStarting: string;
    paySuccessTitle: string;
    paySuccessPending: string;
    paySuccessDone: string;
    payCancelTitle: string;
    payCancelBody: string;
    payManageTitle: string;
    payManageButton: string;
    payRestoreHint: string;
    payOpenBot: string;
  };
  hero: {
    title: string;
    subtitle: string;
    list: string[];
    note: string;
    cta: string;
    microcopy: string;
    fallback: string;
    videoSrc: string;
  };
  footer: {
    terms: string;
    refund: string;
    privacy: string;
  };
  quiz: {
    blocks: QuizBlockContent[];
  };
  block6: {
    screen1: {
      title: string;
      paragraphs: string[];
      timeline: string[];
      cta: string;
    };
    screen2: {
      title: string;
      intro: string[];
      anchor: string;
      postAnchor: string;
      loop: string[];
      microcopy: string;
      cta: string;
    };
  };
  block7: {
    offerTitle: string;
    offerLead: string;
    workTitle: string;
    workSteps: string[];
    workHint: string;
    compareTitle: string;
    compareLeftTitle: string;
    compareLeftItems: string[];
    compareRightTitle: string;
    compareRightItems: string[];
    benefitsTitle: string;
    benefitsItems: string[];
    benefitsHintLines: [string, string];
    casesTitleLines: [string, string];
    cases: CaseReview[];
    saleTitle: string;
    salePrice: string;
    saleCta: string;
    saleNote: string;
  };
  legal: {
    terms: LegalDocument;
    privacy: LegalDocument;
    refund: LegalDocument;
  };
};
