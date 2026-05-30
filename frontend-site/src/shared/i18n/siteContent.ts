import {
  legalDocuments,
  type LegalDocument,
  type LegalDocumentKey,
} from "../../../../shared/legal/documents";
export type { LegalDocument, LegalDocumentKey, LegalSection } from "../../../../shared/legal/documents";

type SiteCopy = {
  navigation: {
    about: string;
    reviews: string;
    legal: string;
    openApp: string;
    launchLanding: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    rating: string;
    note: string;
  };
  benefits: {
    title: string;
    items: Array<{
      kicker: string;
      title: string;
      body: string;
    }>;
  };
  reviews: {
    title: string;
    lead: string;
    items: string[];
  };
  footer: {
    summary: string;
  };
  notFound: {
    title: string;
    body: string;
    home: string;
    cta: string;
  };
  legal: Record<LegalDocumentKey, LegalDocument>;
};

const enLegal: Record<LegalDocumentKey, LegalDocument> = legalDocuments;
const ruLegal: Record<LegalDocumentKey, LegalDocument> = legalDocuments;

export const siteContent: Record<"en" | "ru", SiteCopy> = {
  en: {
    navigation: {
      about: "About",
      reviews: "Reviews",
      legal: "Legal",
      openApp: "App",
      launchLanding: "Quiz",
    },
    hero: {
      eyebrow: "Flirto Guru",
      title: "Dating chats feel easier when you know what to say next.",
      lead:
        "Flirto Guru helps you sound natural, stop overthinking every reply, and move the conversation toward a real date.",
      primaryCta: "Try it now",
      secondaryCta: "Read terms",
      rating: "4.9/5 based on user feedback",
      note: "Short guidance. Better flow. Less cringe.",
    },
    benefits: {
      title: "Why it works",
      items: [
        {
          kicker: "Fast",
          title: "Simple advice",
          body: "Clear next-step ideas instead of long complicated explanations.",
        },
        {
          kicker: "Calm",
          title: "More confidence",
          body: "Less second-guessing, less stress, and more natural conversations.",
        },
        {
          kicker: "Real",
          title: "Built for real chats",
          body: "Focused on the moments when you do not know what to say next.",
        },
      ],
    },
    reviews: {
      title: "Made to feel light, not heavy",
      lead: "A clean, calm flow inspired by modern relationship apps and soft editorial landing pages.",
      items: [
        "I stopped rewriting every message five times before sending it.",
        "It feels simpler to keep the conversation moving without sounding forced.",
        "Less stress, more clarity, and a better chance to get to a date.",
      ],
    },
    footer: {
      summary: "Flirto Guru keeps dating advice simple, clear, and easy to act on.",
    },
    notFound: {
      title: "This page is not here.",
      body: "Go back to Flirto Guru or open the active landing to continue.",
      home: "Back home",
      cta: "Start now",
    },
    legal: {
      terms: enLegal.terms,
      privacy: enLegal.privacy,
      refund: enLegal.refund,
    },
  },
  ru: {
    navigation: {
      about: "О сервисе",
      reviews: "Отзывы",
      legal: "Документы",
      openApp: "App",
      launchLanding: "Quiz",
    },
    hero: {
      eyebrow: "Flirto Guru",
      title: "Когда понятно, что писать дальше, переписка становится легче.",
      lead:
        "Flirto Guru помогает звучать естественно, меньше накручивать себя из-за ответов и увереннее вести общение к реальной встрече.",
      primaryCta: "Попробовать",
      secondaryCta: "Открыть условия",
      rating: "4.9/5 по отзывам пользователей",
      note: "Коротко, спокойно и без натужности.",
    },
    benefits: {
      title: "Почему это работает",
      items: [
        {
          kicker: "Быстро",
          title: "Просто и понятно",
          body: "Короткие советы без перегруженных объяснений.",
        },
        {
          kicker: "Спокойно",
          title: "Больше уверенности",
          body: "Меньше сомнений, меньше стресса и спокойнее диалог.",
        },
        {
          kicker: "По делу",
          title: "Для реальных переписок",
          body: "Фокус на тех моментах, когда непонятно, что написать дальше.",
        },
      ],
    },
    reviews: {
      title: "Легкий и чистый опыт",
      lead: "Мягкий визуальный стиль и понятные блоки, как у современных dating- и relationship-landing pages.",
      items: [
        "Я перестал по пять раз переписывать одно и то же сообщение.",
        "Стало проще держать темп общения без натужности.",
        "Меньше стресса, больше ясности и больше шансов дойти до свидания.",
      ],
    },
    footer: {
      summary: "Flirto Guru делает советы по переписке простыми, понятными и применимыми.",
    },
    notFound: {
      title: "Такой страницы нет.",
      body: "Вернись на Flirto Guru или открой активный лендинг, чтобы продолжить.",
      home: "На главную",
      cta: "Начать",
    },
    legal: {
      terms: ruLegal.terms,
      privacy: ruLegal.privacy,
      refund: ruLegal.refund,
    },
  },
};
