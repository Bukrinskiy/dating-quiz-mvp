export type Locale = "ru" | "en";

export type { LegalDocument, LegalSection } from "../../../../../shared/legal/documents";
import type { LegalDocument, LegalSection } from "../../../../../shared/legal/documents";

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
    analyzing: string;
    payWait: string;
    payError: string;
    payUnavailable: string;
    payPlansError: string;
    payTitle: string;
    paySubtitle: string;
    payEmailLabel: string;
    payEmailExplain: string;
    payEmailHintNoSpam: string;
    payEmailPlaceholder: string;
    payEmailRequired: string;
    payEmailInvalid: string;
    payPlanLabel: string;
    payPlanWeeklyTitle: string;
    payPlanMonthlyTitle: string;
    payPlanYearlyTitle: string;
    payBillingWeekly: string;
    payBillingMonthly: string;
    payBillingYearly: string;
    payPerDay: string;
    payPromoToggleLabel: string;
    payPromoLabel: string;
    payPromoPlaceholder: string;
    payPromoInvalid: string;
    payPromoApplied: string;
    payPromoChecking: string;
    payMostPopular: string;
    paySecureCheckout: string;
    paySupportAccess: string;
    payCancelAnytime: string;
    payMoneyBack: string;
    paySelectPlanHint: string;
    payPlanHelperIdle: string;
    payPlanHelperNeedsEmail: string;
    payPlanHelperSelected: string;
    payStartSelected: string;
    payModeOneTime: string;
    payModeSubscription: string;
    payStart: string;
    payStarting: string;
    payPreparingOverlay: string;
    payOrCard: string;
    payConfirmButton: string;
    payConfirmingButton: string;
    paySuccessTitle: string;
    payPendingTitle: string;
    paySuccessPending: string;
    paySuccessDone: string;
    payCancelTitle: string;
    payCancelBody: string;
    payManageTitle: string;
    payManageButton: string;
    payRestoreHint: string;
    payOpenApp: string;
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
    saleCta: string;
  };
  legal: {
    terms: LegalDocument;
    privacy: LegalDocument;
    refund: LegalDocument;
  };
};
