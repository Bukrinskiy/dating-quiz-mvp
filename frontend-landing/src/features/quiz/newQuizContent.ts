import type { QuizLang } from "../../shared/config/routes";

type ReviewItem = {
  name: string;
  rating: string;
  text: string;
};

type NewQuizContent = {
  ui: {
    continue: string;
    rateLeft: string;
    rateRight: string;
    scaleMin: string;
    scaleMax: string;
    profilePotential: string;
    loadingPlan: string;
    finalCta: string;
    ariaGoHome: string;
    ariaBack: string;
    reviewAriaPrefix: string;
  };
  defaults: {
    resultGoal: string;
    resultSkill: string;
    resultLearn: string;
    ghostedNo: string;
    ghostedYes: string;
  };
  prompt1: {
    title: string;
    subtitle: string;
    reviewsCount: string;
  };
  prompt2: {
    title: string;
    subtitle: string;
    beforeTitle: string;
    afterTitle: string;
    beforeItems: [string, string, string];
    afterItems: [string, string, string];
    note: string;
  };
  prompt3: {
    title: string;
    subtitle: string;
  };
  prompt4: {
    title: string;
    note: string;
    reviews: [ReviewItem, ReviewItem, ReviewItem];
  };
  prompt5: {
    titlePositive: string;
    titleSad: string;
    subtitlePositive: string;
    subtitleSad: string;
  };
  prompt6: {
    title: string;
    subtitle: string;
    list: [string, string, string];
  };
  prompt7: {
    title: string;
    subtitle: string;
    potentialLabels: [string, string, string, string];
    primaryGoal: string;
    desiredSkills: string;
    learningGoal: string;
  };
  calc: {
    labels: [string, string, string, string];
    reviews: [ReviewItem, ReviewItem, ReviewItem];
  };
  final: {
    title: string;
  };
};

export const promptSkillIconByTitle: Record<string, string> = {
  "Секреты привлекательности": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-secrets.svg",
  "Enhancing attractiveness": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-secrets.svg",
  "Уверенная переписка": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-texting.svg",
  "Confident texting": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-texting.svg",
  "Советы по флирту": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-flirting.svg",
  "Flirting tips": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-flirting.svg",
  "Развитие уверенности в себе": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-building.svg",
  "Building confidence": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-building.svg",
};

export const promptGoalIconByTitle: Record<string, string> = {
  "Серьёзные отношения": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-goal-1.svg",
  "A committed relationship": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-goal-1.svg",
  "Случайные свидания": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-goal-2.svg",
  "Casual dating and fun": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-goal-2.svg",
  "Новые знакомства": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-goal-3.svg",
  "New friendships": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-2-goal-3.svg",
};

export const promptLearningIconByTitle: Record<string, string> = {
  "< 5 минут/день": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-7-learning-goal-1.svg",
  "< 5 minutes/day": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-7-learning-goal-1.svg",
  "5 - 10 минут/день": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-7-learning-goal-2.svg",
  "5 - 10 minutes/day": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-7-learning-goal-2.svg",
  "10 - 30 минут/день": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-7-learning-goal-3.svg",
  "10 - 30 minutes/day": "/quiz-affemity-funnel/icons/quiz/quiz-affemity-funnel/prompt-7-learning-goal-3.svg",
};

export const newQuizContent: Record<QuizLang, NewQuizContent> = {
  ru: {
    ui: {
      continue: "Продолжить",
      rateLeft: "Совершенно\nне согласен",
      rateRight: "Полностью\nсогласен",
      scaleMin: "Не очень важно",
      scaleMax: "Очень важно",
      profilePotential: "Потенциал вашей личной жизни",
      loadingPlan: "Загружаем ваш персональный план!",
      finalCta: "Получить моего AI-ассистента по знакомствам",
      ariaGoHome: "На главную",
      ariaBack: "Назад",
      reviewAriaPrefix: "Перейти к отзыву",
    },
    defaults: {
      resultGoal: "Ещё определяюсь",
      resultSkill: "Секреты привлекательности",
      resultLearn: "5 - 10 минут/день",
      ghostedNo: "Нет",
      ghostedYes: "Да",
    },
    prompt1: {
      title: "Вы попали по адресу!",
      subtitle: "Мужчины, как вы, составляют 34% нашего сообщества и уже нашли то, что искали.",
      reviewsCount: "465 отзывов",
    },
    prompt2: {
      title: "Отлично! Вы только что поставили свою первую цель!",
      subtitle: "Давайте продолжим, чтобы найти идеальный способ для вас выстраивать эмоциональную связь.",
      beforeTitle: "До",
      afterTitle: "После",
      beforeItems: [
        "Думал о тебе... Может встретимся скоро?",
        "Как провела вечер?",
        "Сейчас завален работой; может поговорим позже?",
      ],
      afterItems: [
        "Не могу перестать думать о нашем последнем разговоре. Давай скоро увидимся!",
        "Отлично провёл вечер, но было бы ещё лучше, если бы ты была там. Как насчёт весёлого свидания на выходных?",
        "Сейчас по уши в работе, но ты точно в моих мыслях. Давай договоримся о встрече, когда освобожусь!",
      ],
      note: "Давайте продолжим, чтобы найти идеальный способ для вас выстраивать эмоциональную связь.",
    },
    prompt3: {
      title: "Для мужчины важно понимать, когда женщина им интересуется.",
      subtitle: "Распознавание её чувств поможет вам достичь ваших целей в знакомствах. Мы учтём все ваши предпочтения, чтобы создать персональный план!",
    },
    prompt4: {
      title: "Знакомства могут быть непростыми, но мы здесь, чтобы поддержать вас",
      note: "Наши планы помогли 150 000 мужчинам улучшить свою личную жизнь",
      reviews: [
        { name: "Александр", rating: "4.6", text: "Flirto Guru изменил мою переписку — теперь я чувствую себя увереннее, чем когда-либо!" },
        { name: "Виктор", rating: "5", text: "Обожаю, насколько персонализированы советы; они действительно созданы для моих потребностей! 💖✨" },
        { name: "Кирилл", rating: "5", text: "Начало разговора теперь не проблема — это так упрощает знакомство!" },
      ],
    },
    prompt5: {
      titlePositive: "Здорово, что вы настроены позитивно!",
      titleSad: "Нам очень жаль это слышать!",
      subtitlePositive: "После завершения этого путешествия вы выведете свою личную жизнь на ещё более высокий уровень – развивая то, что уже работает для вас.",
      subtitleSad: "Но не переживайте, к концу этого путешествия ваша личная жизнь станет захватывающей и насыщенной.",
    },
    prompt6: {
      title: "Спасибо за честность!",
      subtitle: "Мы знаем, что открываться не всегда легко, но результат того стоит. Ещё несколько вопросов, и ваш идеальный план будет готов!",
      list: [
        "Пропускайте светские беседы и погружайтесь в настоящие разговоры",
        "Достигайте целей в знакомствах в кратчайшие сроки",
        "Всегда знайте, что сказать любой женщине",
      ],
    },
    prompt7: {
      title: "Основываясь на ваших ответах, вот ваш профиль",
      subtitle: "Мы знаем, что открываться не всегда легко, но результат того стоит. Ещё несколько вопросов, и ваш идеальный план будет готов!",
      potentialLabels: ["Низкий", "Средний", "Высокий", "Очень высокий"],
      primaryGoal: "Ваша главная цель:",
      desiredSkills: "Желаемые навыки:",
      learningGoal: "Ваша ежедневная цель обучения:",
    },
    calc: {
      labels: [
        "Постановка ваших целей",
        "Адаптация ключевых областей роста",
        "Подбор контента",
        "Приоритизация задач",
      ],
      reviews: [
        { name: "Александр", rating: "5.0", text: "За месяц у меня было больше свиданий, чем за целый год, благодаря этому приложению! 🥳❤️" },
        { name: "Виктор", rating: "5.0", text: "Наконец-то приложение, которое помогает понять, чего хотят женщины – очень полезно! 👩‍❤️‍👨🔍" },
        { name: "Кирилл", rating: "5.0", text: "Ценю ежедневные цели обучения; они мотивируют меня развиваться! 📈💪" },
      ],
    },
    final: {
      title: "Ваш путь к успеху в знакомствах с Flirto Guru",
    },
  },
  en: {
    ui: {
      continue: "Continue",
      rateLeft: "Completely\ndisagree",
      rateRight: "Completely\nagree",
      scaleMin: "Not very important",
      scaleMax: "Very important",
      profilePotential: "Potential of your dating life",
      loadingPlan: "Loading your personalized plan!",
      finalCta: "Get My AI Dating Assistant",
      ariaGoHome: "Go to home",
      ariaBack: "Back",
      reviewAriaPrefix: "Go to review",
    },
    defaults: {
      resultGoal: "Still figuring it out",
      resultSkill: "Enhancing attractiveness",
      resultLearn: "5 - 10 minutes/day",
      ghostedNo: "No",
      ghostedYes: "Yes",
    },
    prompt1: {
      title: "You are in the right place!",
      subtitle: "Men like you make up 34% of our community and have already found what they were looking for.",
      reviewsCount: "465 reviews",
    },
    prompt2: {
      title: "Awesome! You’ve just set your first goal!",
      subtitle: "Let's keep going so we can find the perfect way for you to build an emotional connection.",
      beforeTitle: "Before",
      afterTitle: "After",
      beforeItems: [
        "I’ve been thinking about you... Want to hang out soon?",
        "Did you enjoy your night?",
        "I’m swamped with work right now; can we chat later?",
      ],
      afterItems: [
        "I’m enjoying our chat, but I bet you’re even more interesting in person. Coffee?",
        "I had a great night out, but it would’ve been better with you there. How about a fun date this weekend?",
        "I’m buried in work at the moment, but you’re definitely on my mind. Let’s schedule a chat when I’m free!",
      ],
      note: "Let's keep going so we can find the perfect way for you to build an emotional connection.",
    },
    prompt3: {
      title: "It's important for a man to know when a woman is interested in him.",
      subtitle: "Recognizing her feelings can help guide you toward achieving your dating goals. We’ll take all your preferences into account to create your personalized plan!",
    },
    prompt4: {
      title: "Dating can be a challenge, but we are here to support you",
      note: "Our plans have helped 150,000 men improve their love life",
      reviews: [
        { name: "Alex", rating: "4.6", text: "Flirto Guru transformed my texting game — now I feel more confident than ever!" },
        { name: "Michael", rating: "5", text: "I love how personalized the advice is; it really feels tailored to my needs! ✨" },
        { name: "Kevin", rating: "5", text: "Starting conversations is no longer a struggle — this makes dating so much easier!" },
      ],
    },
    prompt5: {
      titlePositive: "Great to hear you're feeling positive!",
      titleSad: "We're sorry to hear that!",
      subtitlePositive: "After completing this journey, you’ll take your dating life to an even better place – building on what’s already working for you.",
      subtitleSad: "But don't worry, by the end of this journey, your dating life will be exciting and fulfilling.",
    },
    prompt6: {
      title: "Thanks for being honest!",
      subtitle: "Most guys get left on ‘read’, so it’s important to make every text count.",
      list: [
        "Skip small talk and dive into real conversations",
        "Achieve your dating goals in no time",
        "Always know what to say to any woman",
      ],
    },
    prompt7: {
      title: "Based on your answers, this is your profile",
      subtitle: "Hang tight… analyzing your answers",
      potentialLabels: ["Low", "Medium", "High", "Very high"],
      primaryGoal: "Your primary goal:",
      desiredSkills: "Desired skills:",
      learningGoal: "Your daily learning goal:",
    },
    calc: {
      labels: [
        "Checking your answers...",
        "Fine-tuning your dating blueprint",
        "Building your personalized practice plan.",
        "Optimizing your match strategy",
      ],
      reviews: [
        { name: "Alex", rating: "5.0", text: "I've gone on more dates in a month than I have in a year, thanks to this app! ❤️" },
        { name: "Michael", rating: "5.0", text: "Finally, an app that helps me understand what women want – super helpful! ‍❤️‍" },
        { name: "Kevin", rating: "5.0", text: "I appreciate the daily learning goals; they keep me motivated to grow!" },
      ],
    },
    final: {
      title: "Your path to dating success with Flirto Guru",
    },
  },
};
