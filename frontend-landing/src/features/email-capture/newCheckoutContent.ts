import type { QuizLang } from "../../shared/config/routes";

type FaqItem = { q: string; a: string };

type QuizSummaryDefaults = {
  mainGoal: string;
  personality: string;
  skills: string;
  learning: string;
};

type QuizCheckoutContent = {
  email: {
    loadSessionError: string;
    saveEmailError: string;
    preparingStep: string;
    goHomeAria: string;
    emailHeroAlt: string;
    title: string;
    emailPlaceholder: string;
    loading: string;
    submit: string;
    privacyText: string;
    privacyLink: string;
  };
  checkout: {
    loading: string;
    goHomeAria: string;
    now: string;
    after: string;
    resultIllustrationAlt: string;
    successRate: string;
    textingSkills: string;
    aiGenerated: string;
    mainGoal: string;
    learning: string;
    desiredSkills: string;
    yourPersonality: string;
    heroTitle: string;
    seasonDiscount: string;
    offerExpiresIn: string;
    timerMin: string;
    timerSec: string;
    openCta: string;
    securePayment: string;
    matchHead: string;
    appsCard: string;
    cheatCode: string;
    howTitleLine1: string;
    howTitleLine2: string;
    howStep1: string;
    howStep2: string;
    howStep3: string;
    benName: string;
    benCity: string;
    benAlt: string;
    ratingStarsAlt: string;
    benCopy1: string;
    benCopy2: string;
    arrangedPrefix: string;
    arrangedStrong: string;
    faqTitle: string;
    modalAriaClose: string;
    modalStepPlan: string;
    modalStepPayment: string;
    modalStepReceipt: string;
    modalOrderSummary: string;
    modalDiscountLabel: string;
    modalTotal: string;
    modalChoosePayment: string;
    modalCreditCard: string;
    modalPreparingPayment: string;
    modalPaymentError: string;
    modalOpeningCheckout: string;
    modalLoadCheckoutError: string;
    modalPreparePaymentError: string;
    modalDividerCard: string;
    modalPay: string;
    modalConfirming: string;
    offerCopy: string;
    planMostPopular: string;
    perDay: string;
    billingEveryWeek: string;
    billingEveryWeeks: (count: number) => string;
    billingEveryMonth: string;
    billingEveryMonths: (count: number) => string;
    billingEveryYear: string;
    billingEveryYears: (count: number) => string;
    billingRecurring: string;
    planThreeMonths: string;
    planMonthly: string;
    planYearly: string;
    planDefaultMonthly: string;
    planDays: (days: number) => string;
    planMonths: (count: number) => string;
    summaryPersonalityBoth: string;
    productName: string;
  };
  faqItems: FaqItem[];
  matchFeatures: string[];
  howStepTargets: string[];
  quizSummaryDefaults: QuizSummaryDefaults;
};

export const quizCheckoutContent: Record<QuizLang, QuizCheckoutContent> = {
  ru: {
    email: {
      loadSessionError: "Не удалось загрузить сессию квиза",
      saveEmailError: "Не удалось сохранить email",
      preparingStep: "Подготавливаем следующий шаг...",
      goHomeAria: "На главную",
      emailHeroAlt: "Письмо",
      title: "Введите email, чтобы увидеть результаты",
      emailPlaceholder: "Электронная почта",
      loading: "Загрузка...",
      submit: "Получить моего AI-ассистента по знакомствам",
      privacyText: "Ваша конфиденциальность важна для нас, и мы заботимся о защите вашей личной информации. Мы обрабатываем ваши данные в соответствии с нашей",
      privacyLink: "Политикой конфиденциальности",
    },
    checkout: {
      loading: "Открываем checkout...",
      goHomeAria: "На главную",
      now: "Сейчас",
      after: "После",
      resultIllustrationAlt: "Иллюстрация результата",
      successRate: "Вероятность успеха:",
      textingSkills: "Навыки переписки:",
      aiGenerated: "Создано ИИ",
      mainGoal: "Главная цель",
      learning: "Обучение",
      desiredSkills: "Желаемые навыки",
      yourPersonality: "Ваша личность",
      heroTitle: "Ваш персональный AI-ассистент по знакомствам",
      seasonDiscount: "Применена ограниченная скидка «Сезон знакомств»! Экономия до 76%",
      offerExpiresIn: "Предложение истекает через",
      timerMin: "мин",
      timerSec: "сек",
      openCta: "Получить моего персонального ассистента по знакомствам",
      securePayment: "Безопасный платёж",
      matchHead: "но что дальше?",
      appsCard: "Работает со всеми вашими любимыми приложениями для знакомств!",
      cheatCode: "Этот «чит-код» преобразит ваше общение онлайн и в реальной жизни",
      howTitleLine1: "В 5,5 раз больше свиданий с помощью ИИ.",
      howTitleLine2: "Как это работает?",
      howStep1: "Загрузите скриншот",
      howStep2: "Выберите свою цель",
      howStep3: "Очаруйте её умными ответами и фразами, тщательно созданными ИИ.",
      benName: "Бен",
      benCity: "Торонто",
      benAlt: "Бен",
      ratingStarsAlt: "Звёзды рейтинга",
      benCopy1: "Революция для быстрых сообщений и игривого флирта.",
      benCopy2: "Улавливает социальные сигналы, не звучит как бот и адаптируется к ситуации и последнему отправленному сообщению.",
      arrangedPrefix: "Наши пользователи уже назначили",
      arrangedStrong: "более 100 000 свиданий",
      faqTitle: "Часто задаваемые вопросы",
      modalAriaClose: "Закрыть",
      modalStepPlan: "Выбор тарифа",
      modalStepPayment: "Оплата",
      modalStepReceipt: "Чек",
      modalOrderSummary: "Сводка заказа",
      modalDiscountLabel: "Скидка",
      modalTotal: "Итого:",
      modalChoosePayment: "Выберите способ оплаты",
      modalCreditCard: "Кредитная карта",
      modalPreparingPayment: "Подготавливаем оплату...",
      modalPaymentError: "Ошибка оплаты",
      modalOpeningCheckout: "Открываем checkout...",
      modalLoadCheckoutError: "Не удалось загрузить checkout",
      modalPreparePaymentError: "Не удалось подготовить оплату",
      modalDividerCard: "или карта",
      modalPay: "Оплатить",
      modalConfirming: "Подтверждение...",
      offerCopy: "Вы оформляете подписку на сервис Flirto Guru со скидкой. Вы соглашаетесь, что выбранный вами план будет автоматически продлён по полной цене на последующие периоды продления, и с вас будет взиматься плата, пока вы не отмените подписку.",
      planMostPopular: "Самый популярный",
      perDay: "в день",
      billingEveryWeek: "Списание каждую неделю",
      billingEveryWeeks: (count) => `Списание каждые ${count} недель`,
      billingEveryMonth: "Списание каждый месяц",
      billingEveryMonths: (count) => `Списание каждые ${count} месяца`,
      billingEveryYear: "Списание каждый год",
      billingEveryYears: (count) => `Списание каждые ${count} лет`,
      billingRecurring: "Рекуррентное списание",
      planThreeMonths: "План на 3 месяца",
      planMonthly: "План на месяц",
      planYearly: "План на 1 год",
      planDefaultMonthly: "План на месяц",
      planDays: (days) => `План на ${days} дней`,
      planMonths: (count) => `План на ${count} месяца`,
      summaryPersonalityBoth: "Интроверт и экстраверт",
      productName: "Flirto Guru Premium",
    },
    faqItems: [
      {
        q: "Могу ли я отменить подписку?",
        a: "Если вы не увидите прогресса в течение 11 дней, мы сделаем полный возврат. После 11 дней вы можете отменить подписку перед следующим списанием.",
      },
      {
        q: "Как работает Flirto Guru?",
        a: "Загрузите скриншот диалога, ИИ проанализирует контекст и предложит персональные ответы и фразы для знакомства.",
      },
      {
        q: "Flirto Guru только для случайных встреч?",
        a: "Нет. Сервис подходит и для серьезных отношений, и для легкого общения.",
      },
      {
        q: "Разве я не могу сам писать женщинам?",
        a: "Можете, но Flirto Guru дает проверенные фразы, экономит время и заметно повышает шанс на успешное знакомство.",
      },
    ],
    matchFeatures: [
      "Создавайте индивидуальные привлекательные фразы для начала разговора",
      "Персонализированные предложения ответов",
      "Выделяйтесь с нашим генератором био",
      "Подсказки для знакомств в реальной жизни",
      "Доступ к новым функциям",
    ],
    howStepTargets: ["Назначить свидание", "Найти жену", "Заняться сексом"],
    quizSummaryDefaults: {
      mainGoal: "Серьёзные отношения",
      personality: "И то, и другое",
      skills: "Секреты привлекательности",
      learning: "5 - 10 минут/день",
    },
  },
  en: {
    email: {
      loadSessionError: "Failed to load quiz session",
      saveEmailError: "Failed to save email",
      preparingStep: "Preparing the next step...",
      goHomeAria: "Go to home",
      emailHeroAlt: "Email",
      title: "Enter your email to see your results",
      emailPlaceholder: "Email address",
      loading: "Loading...",
      submit: "Get my AI dating assistant",
      privacyText: "Your privacy matters to us, and we protect your personal information in accordance with our",
      privacyLink: "Privacy Policy",
    },
    checkout: {
      loading: "Opening checkout...",
      goHomeAria: "Go to home",
      now: "Now",
      after: "After",
      resultIllustrationAlt: "Result illustration",
      successRate: "Success rate:",
      textingSkills: "Texting skills:",
      aiGenerated: "AI-generated",
      mainGoal: "Main goal",
      learning: "Learning",
      desiredSkills: "Desired skills",
      yourPersonality: "Your personality",
      heroTitle: "Your personal AI dating assistant",
      seasonDiscount: "Limited “Dating Season” discount applied! Save up to 76%",
      offerExpiresIn: "Offer expires in",
      timerMin: "min",
      timerSec: "sec",
      openCta: "Get my personal dating assistant",
      securePayment: "Secure payment",
      matchHead: "but what next?",
      appsCard: "Works with all your favorite dating apps!",
      cheatCode: "This cheat code transforms your chats online and in real life",
      howTitleLine1: "5.5x more dates with AI.",
      howTitleLine2: "How it works?",
      howStep1: "Upload a screenshot",
      howStep2: "Choose your goal",
      howStep3: "Charm her with smart AI-crafted replies and lines.",
      benName: "Ben",
      benCity: "Toronto",
      benAlt: "Ben",
      ratingStarsAlt: "Rating stars",
      benCopy1: "A game changer for quick replies and playful flirting.",
      benCopy2: "It catches social cues, doesn't sound robotic, and adapts to context and your last message.",
      arrangedPrefix: "Our users have already arranged",
      arrangedStrong: "over 100,000 dates",
      faqTitle: "Frequently asked questions",
      modalAriaClose: "Close",
      modalStepPlan: "Select plan",
      modalStepPayment: "Payment",
      modalStepReceipt: "Receipt",
      modalOrderSummary: "Order Summary",
      modalDiscountLabel: "Discount",
      modalTotal: "Total:",
      modalChoosePayment: "Choose payment method",
      modalCreditCard: "Credit card",
      modalPreparingPayment: "Preparing payment...",
      modalPaymentError: "Payment error",
      modalOpeningCheckout: "Opening checkout...",
      modalLoadCheckoutError: "Failed to load checkout",
      modalPreparePaymentError: "Failed to prepare payment",
      modalDividerCard: "or card",
      modalPay: "Pay",
      modalConfirming: "Confirming...",
      offerCopy: "You are subscribing to Flirto Guru with a discounted offer. You agree that your selected plan renews automatically at full price for subsequent billing periods until canceled.",
      planMostPopular: "Most popular",
      perDay: "per day",
      billingEveryWeek: "Billed every week",
      billingEveryWeeks: (count) => `Billed every ${count} weeks`,
      billingEveryMonth: "Billed every month",
      billingEveryMonths: (count) => `Billed every ${count} months`,
      billingEveryYear: "Billed every year",
      billingEveryYears: (count) => `Billed every ${count} years`,
      billingRecurring: "Recurring billing",
      planThreeMonths: "3-month plan",
      planMonthly: "Monthly plan",
      planYearly: "Yearly plan",
      planDefaultMonthly: "Monthly plan",
      planDays: (days) => `${days}-day plan`,
      planMonths: (count) => `${count}-month plan`,
      summaryPersonalityBoth: "Introvert and extrovert",
      productName: "Flirto Guru Premium",
    },
    faqItems: [
      {
        q: "Can I cancel my subscription?",
        a: "If you do not see progress within 11 days, we provide a full refund. After 11 days, you can cancel before your next billing cycle.",
      },
      {
        q: "How does Flirto Guru work?",
        a: "Upload a chat screenshot, AI analyzes the context, and gives personalized replies and opening lines.",
      },
      {
        q: "Is Flirto Guru only for casual dating?",
        a: "No. It helps both with serious relationships and lighter dating.",
      },
      {
        q: "Can’t I just text women myself?",
        a: "You can, but Flirto Guru gives proven phrases, saves time, and increases your chance of successful dates.",
      },
    ],
    matchFeatures: [
      "Create personalized attractive openers",
      "Tailored reply suggestions",
      "Stand out with our bio generator",
      "Real-life dating guidance",
      "Access to new features",
    ],
    howStepTargets: ["Set up a date", "Find a wife", "Have casual fun"],
    quizSummaryDefaults: {
      mainGoal: "A committed relationship",
      personality: "Both",
      skills: "Enhancing attractiveness",
      learning: "5 - 10 minutes/day",
    },
  },
};

export const quizSummaryTranslations = {
  mainGoal: {
    "Серьёзные отношения": "A committed relationship",
    "Случайные свидания": "Casual dating and fun",
    "Новые знакомства": "New friendships",
    "Ещё определяюсь": "Still figuring it out",
    "A committed relationship": "Серьёзные отношения",
    "Casual dating and fun": "Случайные свидания",
    "New friendships": "Новые знакомства",
    "Still figuring it out": "Ещё определяюсь",
  },
  personality: {
    "Интроверт": "Introvert",
    "Экстраверт": "Extrovert",
    "И то, и другое": "Both",
    "Introvert": "Интроверт",
    "Extrovert": "Экстраверт",
    "Both": "И то, и другое",
  },
  skills: {
    "Секреты привлекательности": "Enhancing attractiveness",
    "Уверенная переписка": "Confident texting",
    "Советы по флирту": "Flirting tips",
    "Развитие уверенности в себе": "Building confidence",
    "Начало разговоров": "Starting conversations",
    "Enhancing attractiveness": "Секреты привлекательности",
    "Confident texting": "Уверенная переписка",
    "Flirting tips": "Советы по флирту",
    "Building confidence": "Развитие уверенности в себе",
    "Starting conversations": "Начало разговоров",
  },
  learning: {
    "< 5 минут/день": "< 5 minutes/day",
    "5 - 10 минут/день": "5 - 10 minutes/day",
    "10 - 30 минут/день": "10 - 30 minutes/day",
    "> 30 минут/день": "> 30 minutes/day",
    "< 5 minutes/day": "< 5 минут/день",
    "5 - 10 minutes/day": "5 - 10 минут/день",
    "10 - 30 minutes/day": "10 - 30 минут/день",
    "> 30 minutes/day": "> 30 минут/день",
  },
} as const;
