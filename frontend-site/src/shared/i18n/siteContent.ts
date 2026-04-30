export type LegalDocumentKey = "terms" | "privacy" | "refund";

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

type SiteCopy = {
  navigation: {
    about: string;
    reviews: string;
    legal: string;
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

const enLegal: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    title: "Terms of Use",
    updated: "Last updated: February 11, 2026",
    intro: "By using this service, including the Telegram bot, you agree to these terms.",
    sections: [
      {
        title: "1. Service Description",
        paragraphs: [
          "The service is an online tool provided through a Telegram bot.",
          "The service is intended for automated analysis of text information entered by the user and generation of informational communication recommendations.",
          "The service is not professional psychological, medical, legal, or other consulting advice.",
        ],
      },
      {
        title: "2. Access and Subscription",
        paragraphs: [
          "Access to the service is provided on a paid basis for a limited period (for example, one week or one month), depending on the selected plan.",
          "After successful payment, access to the Telegram bot functionality is provided automatically for the selected period.",
        ],
      },
      {
        title: "3. Payment",
        paragraphs: [
          "Payments are processed through third-party payment systems. The service does not store or process users' bank card data.",
          "Pricing, access term, and payment conditions are shown before payment confirmation.",
        ],
      },
      {
        title: "4. No Guarantees",
        paragraphs: [
          "The service provides informational content generated automatically.",
          "You understand that effectiveness depends on multiple factors outside the service's control.",
        ],
        list: [
          "We do not guarantee any specific results.",
          "We do not guarantee improved communication outcomes.",
          "We do not guarantee that the service will match user expectations.",
        ],
      },
      {
        title: "5. User Responsibility",
        paragraphs: [
          "By using the service, the user confirms that:",
          "The user independently decides how to use the provided information.",
        ],
        list: [
          "they are at least 18 years old;",
          "they use the service on their own initiative;",
          "they understand the automated nature of the generated replies.",
        ],
      },
      {
        title: "6. Prohibited Use",
        paragraphs: [
          "The following is prohibited:",
          "Administration reserves the right to limit or terminate access in case of violations.",
        ],
        list: [
          "using the service for illegal purposes;",
          "attempts to interfere with service operation;",
          "using the service to cause harm to third parties.",
        ],
      },
      {
        title: "7. Service Availability",
        paragraphs: [
          "We aim to provide uninterrupted operation, but do not guarantee the absence of technical failures, errors, or temporary access restrictions.",
        ],
      },
      {
        title: "8. Limitation of Liability",
        paragraphs: [
          "The service and its owners are not liable for any indirect or consequential damages resulting from use of the service, to the extent permitted by applicable law.",
        ],
      },
      {
        title: "9. Contact Information",
        paragraphs: [
          "For any questions related to the service, contact us at:",
          "Billing contacts:",
          "ADVERTEX ADVERTISING RESEARCHES AND CONSULTANCIES LLC",
          "License No: 1054701",
          "Address: P.O.BOX 624937, Dubai, UAE",
        ],
        email: "support@flirto.guru",
        list: ["Billing contact: billing@advertex.biz"],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: February 11, 2026",
    intro:
      "This Privacy Policy explains what data we collect, how we use it, and how we protect it when you use our website and online service.",
    sections: [
      {
        title: "1. What Data We Collect",
        paragraphs: ["We may collect the following categories of information:"],
        children: [
          {
            title: "1.1. Personal Data",
            paragraphs: ["You may voluntarily provide data such as:"],
            list: [
              "email address;",
              "name (when creating an account);",
              "information included in support requests.",
            ],
          },
          {
            title: "1.2. Technical Data",
            paragraphs: ["The following may be collected automatically:"],
            list: [
              "IP address;",
              "device and browser type;",
              "visited pages information;",
              "interaction data with the service.",
            ],
          },
          {
            title: "1.3. Payment Information",
            paragraphs: [
              "Payments are processed by third-party payment providers.",
              "We do not store or process bank card details.",
            ],
          },
        ],
      },
      {
        title: "2. Purposes of Processing",
        paragraphs: ["We use information to:"],
        list: [
          "provide and support the service;",
          "improve service quality;",
          "communicate with users;",
          "comply with legal requirements.",
        ],
      },
      {
        title: "3. Cookies",
        paragraphs: [
          "We may use cookies and similar technologies for:",
          "You can disable cookies in your browser settings.",
        ],
        list: ["traffic analytics;", "improving website functionality."],
      },
      {
        title: "4. Sharing Data with Third Parties",
        paragraphs: [
          "We may share data with:",
          "All third parties are required to maintain confidentiality of received information.",
        ],
        list: [
          "payment providers (for payment processing);",
          "analytics services;",
          "technical contractors.",
        ],
      },
      {
        title: "5. Data Protection",
        paragraphs: [
          "We apply reasonable technical and organizational measures to protect data from unauthorized access, loss, or alteration.",
          "However, no method of internet transmission can guarantee absolute security.",
        ],
      },
      {
        title: "6. Data Retention Period",
        paragraphs: [
          "Personal data is retained only for as long as necessary to provide services and meet legal obligations.",
        ],
      },
      {
        title: "7. User Rights",
        paragraphs: [
          "Under applicable law, you have the right to:",
          "To exercise these rights, contact us by email below.",
        ],
        list: [
          "request information about your data;",
          "request correction or deletion;",
          "withdraw consent to processing.",
        ],
      },
      {
        title: "8. Age Restrictions",
        paragraphs: [
          "The service is intended for users over 18 years old.",
          "We do not knowingly collect data from minors.",
        ],
      },
      {
        title: "9. Policy Changes",
        paragraphs: [
          "We may update this Policy periodically.",
          "The updated version is published on this page with the revision date.",
        ],
      },
      {
        title: "10. Contacts",
        paragraphs: ["For all data-processing questions, you can contact us at:"],
        email: "support@flirto.guru",
      },
    ],
  },
  refund: {
    title: "Refund Policy",
    updated: "Last updated: February 11, 2026",
    sections: [
      {
        title: "1. Digital Service",
        paragraphs: [
          "The service provides digital access to Telegram bot functionality immediately after payment confirmation.",
          "From the moment access is granted, the service is considered delivered.",
        ],
      },
      {
        title: "2. Refund Conditions",
        paragraphs: ["A refund request can be considered only if:"],
        list: [
          "access to the service was not provided due to a technical issue;",
          "the user contacted support within 24 hours of payment.",
        ],
      },
      {
        title: "3. Cases Where Refunds Are Not Issued",
        paragraphs: ["Refunds are not issued in the following cases:"],
        list: [
          "dissatisfaction with the content or format of generated responses;",
          "expectation of a specific result or effect;",
          "partial use of the paid period;",
          "incorrect understanding of service principles before payment.",
        ],
      },
      {
        title: "4. How to Request a Refund",
        paragraphs: [
          "To request a refund review, the user must send an email to:",
          "and include:",
        ],
        email: "support@flirto.guru",
        list: [
          "payment confirmation;",
          "Telegram username;",
          "a brief description of the issue.",
        ],
      },
      {
        title: "5. Refund Timing",
        paragraphs: [
          "If approved, funds are returned to the original payment method within timelines defined by the payment provider.",
        ],
      },
    ],
  },
};

const ruLegal: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    title: "Пользовательское соглашение",
    updated: "Дата последнего обновления: 11.02.2026",
    intro: "Используя данный сервис, включая Telegram-бота, вы соглашаетесь с настоящими условиями.",
    sections: [
      {
        title: "1. Описание сервиса",
        paragraphs: [
          "Сервис представляет собой онлайн-инструмент, предоставляемый через Telegram-бота.",
          "Сервис предназначен для автоматического анализа текстовой информации, вводимой пользователем, и генерации информационных рекомендаций по коммуникации.",
          "Сервис не является профессиональной психологической, медицинской, юридической или иной консультацией.",
        ],
      },
      {
        title: "2. Доступ и подписка",
        paragraphs: [
          "Доступ к сервису предоставляется на платной основе на ограниченный период времени (например, на неделю или на месяц), в зависимости от выбранного тарифа.",
          "После успешной оплаты пользователю автоматически предоставляется доступ к функционалу Telegram-бота на срок, соответствующий выбранному тарифу.",
        ],
      },
      {
        title: "3. Оплата",
        paragraphs: [
          "Оплата услуг осуществляется через сторонние платежные системы. Сервис не хранит и не обрабатывает данные банковских карт пользователей.",
          "Стоимость, срок доступа и условия оплаты отображаются до подтверждения платежа.",
        ],
      },
      {
        title: "4. Отсутствие гарантий",
        paragraphs: [
          "Сервис предоставляет информационный контент, формируемый автоматически.",
          "Пользователь понимает, что эффективность использования предоставляемой информации зависит от множества факторов, находящихся вне контроля сервиса.",
        ],
        list: [
          "Мы не гарантируем достижение каких-либо конкретных результатов.",
          "Мы не гарантируем улучшение качества общения.",
          "Мы не гарантируем соответствие ожиданиям пользователя.",
        ],
      },
      {
        title: "5. Ответственность пользователя",
        paragraphs: [
          "Используя сервис, пользователь подтверждает, что:",
          "Пользователь самостоятельно принимает решения о том, как использовать полученную информацию.",
        ],
        list: [
          "ему исполнилось 18 лет;",
          "он использует сервис по собственной инициативе;",
          "он понимает автоматический характер предоставляемых ответов.",
        ],
      },
      {
        title: "6. Запрещенное использование",
        paragraphs: [
          "Запрещается:",
          "Администрация оставляет за собой право ограничить или прекратить доступ к сервису в случае нарушений.",
        ],
        list: [
          "использование сервиса в незаконных целях;",
          "попытки вмешательства в работу сервиса;",
          "использование сервиса для причинения вреда третьим лицам.",
        ],
      },
      {
        title: "7. Доступность сервиса",
        paragraphs: [
          "Мы стремимся обеспечить бесперебойную работу сервиса, однако не гарантируем отсутствие технических сбоев, ошибок или временных ограничений доступа.",
        ],
      },
      {
        title: "8. Ограничение ответственности",
        paragraphs: [
          "Сервис и его владельцы не несут ответственности за любые косвенные или последующие убытки, возникшие в результате использования сервиса, в пределах, допустимых применимым законодательством.",
        ],
      },
      {
        title: "9. Контактная информация",
        paragraphs: [
          "По всем вопросам, связанным с работой сервиса, вы можете связаться с нами по адресу:",
          "Контакты по вопросам биллинга:",
          "ADVERTEX ADVERTISING RESEARCHES AND CONSULTANCIES LLC",
          "License No: 1054701",
          "Address: P.O.BOX 624937, Dubai, UAE",
        ],
        email: "support@flirto.guru",
        list: ["Billing contact: billing@advertex.biz"],
      },
    ],
  },
  privacy: {
    title: "Политика конфиденциальности",
    updated: "Дата последнего обновления: 11 февраля 2026 года",
    intro:
      "Настоящая Политика конфиденциальности описывает, какие данные мы собираем, как их используем и защищаем при использовании нашего сайта и онлайн-сервиса.",
    sections: [
      {
        title: "1. Какие данные мы собираем",
        paragraphs: ["Мы можем собирать следующие категории информации:"],
        children: [
          {
            title: "1.1. Персональные данные",
            paragraphs: ["Вы можете добровольно предоставить нам свои данные, например:"],
            list: [
              "адрес электронной почты;",
              "имя (при создании аккаунта);",
              "информацию, указанную при обращении в службу поддержки.",
            ],
          },
          {
            title: "1.2. Технические данные",
            paragraphs: ["Автоматически могут собираться:"],
            list: [
              "IP-адрес;",
              "тип устройства и браузера;",
              "сведения о посещенных страницах;",
              "данные о взаимодействии с сервисом.",
            ],
          },
          {
            title: "1.3. Платежная информация",
            paragraphs: [
              "Оплата услуг осуществляется через сторонних платежных провайдеров.",
              "Мы не храним и не обрабатываем данные банковских карт.",
            ],
          },
        ],
      },
      {
        title: "2. Цели обработки данных",
        paragraphs: ["Мы используем информацию для:"],
        list: [
          "предоставления и поддержки работы сервиса;",
          "улучшения качества услуг;",
          "обратной связи с пользователями;",
          "выполнения требований законодательства.",
        ],
      },
      {
        title: "3. Файлы cookie",
        paragraphs: [
          "Мы можем использовать cookie и аналогичные технологии для:",
          "Вы можете отключить cookie в настройках своего браузера.",
        ],
        list: ["анализа посещаемости;", "улучшения функциональности сайта."],
      },
      {
        title: "4. Передача данных третьим лицам",
        paragraphs: [
          "Мы можем передавать данные:",
          "Все третьи лица обязаны обеспечивать конфиденциальность полученной информации.",
        ],
        list: [
          "платежным провайдерам (для обработки оплаты);",
          "сервисам аналитики;",
          "техническим подрядчикам.",
        ],
      },
      {
        title: "5. Защита информации",
        paragraphs: [
          "Мы принимаем разумные технические и организационные меры для защиты данных от несанкционированного доступа, утраты или изменения.",
          "Однако ни один способ передачи данных через Интернет не может гарантировать абсолютную безопасность.",
        ],
      },
      {
        title: "6. Срок хранения данных",
        paragraphs: [
          "Персональные данные хранятся только в течение времени, необходимого для предоставления услуг и выполнения юридических обязательств.",
        ],
      },
      {
        title: "7. Права пользователя",
        paragraphs: [
          "В соответствии с применимым законодательством вы имеете право:",
          "Для реализации своих прав вы можете связаться с нами по электронной почте ниже.",
        ],
        list: [
          "запросить информацию о ваших данных;",
          "потребовать их исправления или удаления;",
          "отозвать согласие на обработку.",
        ],
      },
      {
        title: "8. Возрастные ограничения",
        paragraphs: [
          "Сервис предназначен для лиц старше 18 лет.",
          "Мы не осуществляем сознательный сбор данных несовершеннолетних.",
        ],
      },
      {
        title: "9. Изменения в Политике",
        paragraphs: [
          "Мы можем периодически обновлять настоящую Политику.",
          "Обновленная версия публикуется на данной странице с указанием даты изменения.",
        ],
      },
      {
        title: "10. Контакты",
        paragraphs: ["По всем вопросам, связанным с обработкой данных, вы можете связаться с нами:"],
        email: "support@flirto.guru",
      },
    ],
  },
  refund: {
    title: "Политика возврата средств",
    updated: "Дата последнего обновления: 11.02.2026",
    sections: [
      {
        title: "1. Цифровая услуга",
        paragraphs: [
          "Сервис предоставляет цифровой доступ к функционалу Telegram-бота сразу после подтверждения оплаты.",
          "С момента предоставления доступа услуга считается оказанной.",
        ],
      },
      {
        title: "2. Условия возврата",
        paragraphs: ["Запрос на возврат средств может быть рассмотрен только в случае, если:"],
        list: [
          "доступ к сервису не был предоставлен по технической причине;",
          "пользователь обратился в поддержку в течение 24 часов с момента оплаты.",
        ],
      },
      {
        title: "3. Случаи, при которых возврат не осуществляется",
        paragraphs: ["Возврат средств не производится в следующих случаях:"],
        list: [
          "неудовлетворенность содержанием или форматом предоставляемых ответов;",
          "ожидание конкретного результата или эффекта;",
          "частичное использование оплаченного периода;",
          "неправильное понимание принципов работы сервиса перед оплатой.",
        ],
      },
      {
        title: "4. Порядок обращения за возвратом",
        paragraphs: [
          "Для рассмотрения запроса на возврат пользователь должен направить письмо на адрес:",
          "и указать:",
        ],
        email: "support@flirto.guru",
        list: [
          "подтверждение оплаты;",
          "Telegram-username;",
          "краткое описание проблемы.",
        ],
      },
      {
        title: "5. Сроки возврата",
        paragraphs: [
          "В случае одобрения возврата средства возвращаются на тот же способ оплаты в сроки, зависящие от платежной системы.",
        ],
      },
    ],
  },
};

export const siteContent: Record<"en" | "ru", SiteCopy> = {
  en: {
    navigation: {
      about: "About",
      reviews: "Reviews",
      legal: "Legal",
      launchLanding: "Start now",
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
      launchLanding: "Начать",
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
