import type { Role, SessionMode } from "../../types";

export const roleLabels: Record<Role, string> = {
  "USER_SELF": "Я писал(а)",
  "USER_PEER": "Он·Она писал(а)"
};

export const messages = {
  "brand": {
    "name": "Flirto Guru",
    "tagline": "Новая консультация"
  },
  "tabs": [
    {
      "to": "/app",
      "label": "Совет"
    },
    {
      "to": "/paywall",
      "label": "Доступ"
    },
    {
      "to": "/help",
      "label": "Помощь"
    },
    {
      "to": "/app/profile",
      "label": "Профиль"
    }
  ],
  "shell": {
    "logout": "Выйти",
    "boot": "Открываем Flirto Guru...",
    "back": "Назад",
    "finishSession": "Завершить",
    "close": "Закрыть",
    "retry": "Повторить",
    "themeLight": "Светлая тема",
    "themeDark": "Тёмная тема"
  },
  "login": {
    "eyebrow": "Вход",
    "title": "Войти",
    "body": "",
    "emailLabel": "Email",
    "emailPlaceholder": "you@example.com",
    "codeLabel": "Код из письма",
    "codePlaceholder": "000000",
    "requestCode": "Получить код →",
    "confirmCode": "Войти →",
    "resendCode": "Изменить email",
    "emailHint": "",
    "requestSuccess": "Код отправлен — проверь почту.",
    "requestError": "Не получилось отправить код.",
    "confirmError": "Код не подошел."
  },
  "paywall": {
    "eyebrow": "Доступ",
    "title": "Нужна активация",
    "body": "После оплаты вернись сюда — приложение подтянет статус",
    "primaryCta": "Открыть оплату",
    "activeTitle": "Доступ активен",
    "activeBody": "Доступ привязан к этому email",
    "activeStatusLabel": "Текущий доступ",
    "activeEmailLabel": "Email",
    "manageCta": "Управлять доступом",
    "checkoutStarting": "Открываем оплату...",
    "checkoutError": "Не получилось открыть оплату. Попробуй ещё раз.",
    "bullets": [
      "Доступ привязан к email.",
      "После оплаты не нужно входить заново.",
      "Поддержка поможет если что-то не сработало."
    ],
    "checking": "Проверяем статус доступа..."
  },
  "access": {
    "grace_period": {
      "title": "Продлите доступ",
      "body": "Льготный период скоро закончится.",
      "cta": "Продлить"
    },
    "token_issued": {
      "title": "Доступ выпущен",
      "body": "Если ты только что оплатил(а), просто открой оплату и вернись обратно.",
      "cta": "Открыть доступ"
    }
  },
  "home": {
    "eyebrow": "Совет",
    "title": "",
    "body": "Добавь контекст и получи разбор прямо в чате.",
    "opening": "Открываем...",
    "startConsultation": "Новая консультация",
    "startBody": "Добавь переписку, скриншот или голосовое — получишь разбор, план и текст ответа.",
    "startCta": "Новая консультация",
    "quickProfile": "Профиль",
    "quickSupport": "Поддержка",
    "quickHelp": "Помощь",
    "pushTitle": "Оповещать, когда ответ готов?",
    "pushBody": "Только по важным событиям: готовый ответ, доступ и статус аккаунта.",
    "pushEnable": "Включить уведомления",
    "pushSkip": "Не сейчас",
    "installTitle": "Установите на экран Home",
    "installBody": "Так приложение открывается как нативное и не теряется в браузерных вкладках.",
    "installAction": "Установить",
    "installIos": "На iPhone откройте Share и выберите Add to Home Screen.",
    "installSteps": {
      "ios": {
        "title": "Сначала установи Flirto Guru",
        "body": "На iPhone открой Safari, нажми «Поделиться» и выбери «На экран Домой». Так приложение будет запускаться с главного экрана как обычное.",
        "action": "Установить"
      },
      "android": {
        "title": "Сначала установи Flirto Guru",
        "body": "Добавь приложение на главный экран, чтобы открывать его быстрее и не терять среди вкладок браузера.",
        "action": "Установить"
      },
      "desktop": {
        "title": "Сначала установи Flirto Guru",
        "body": "Используй значок установки в адресной строке или меню браузера, чтобы приложение всегда было под рукой.",
        "action": "Установить"
      }
    },
    "installAssist": {
      "ios": "Не удалось открыть меню «Поделиться». Открой его в Safari и выбери «На экран Домой».",
      "android": "Если окно установки не открылось, используй меню браузера и выбери «Установить приложение».",
      "desktop": "Если окно установки не открылось, используй значок установки в адресной строке или меню браузера."
    },
    "statusTitle": "Статус доступа",
    "statusFallback": "Активен",
    "accountTitle": "Аккаунт",
    "resetTitle": "Сбросить активные сессии",
    "resetBody": "Если осталась незавершенная сессия, закрой её и начни заново.",
    "resetCta": "Закрыть сессии",
    "resetSuccess": "Активные сессии закрыты.",
    "resetEmpty": "Активных сессий не было.",
    "resetError": "Не получилось закрыть сессии.",
    "recentTitle": "Недавние",
    "recentEmptyTitle": "История появится здесь",
    "recentEmptyBody": "После завершённых консультаций последние сессии можно будет открыть отсюда.",
    "recentFallbackPreview": "Недавно открытая консультация",
    "hoursAgo": "ч назад",
    "daysAgo": "д назад",
    "onboardingSkip": "Пропустить",
    "onboardingNext": "Далее",
    "onboardingStart": "Начать",
    "onboardingSteps": [
      {
        "title": "Добавь контекст",
        "body": "Текст переписки, скриншот или голосовое — бот разберётся с ролями сам"
      },
      {
        "title": "Нажми готово",
        "body": "Покажем загрузку прямо в чате и соберём ответ без лишних экранов"
      },
      {
        "title": "Разбор прямо в чате",
        "body": "Главный ответ виден сразу, детали открываются кнопками под сообщением"
      }
    ]
  },
  "session": {
    "composerPlaceholder": "Опиши ситуацию или вставь переписку…",
    "send": "Отправить",
    "attach": "Вложение",
    "attachImage": "Галерея",
    "attachCamera": "Камера",
    "attachAudio": "Аудиофайл",
    "attachVoice": "Голосовое",
    "roleTitle": "Кто отправил сообщение",
    "roleHint": "Эти метаданные уйдут вместе с текстом, фото или голосовым.",
    "roleName": "Имя автора",
    "roleDate": "Дата и время",
    "roleApply": "Сохранить",
    "batchMore": "+ Ещё",
    "batchClose": "Готово",
    "batchReady": "фрагментов · Готово к разбору",
    "confirmTitle": "Проверь контекст",
    "confirmHeading": "Проверь контекст",
    "confirmBody": "Быстро проверь, что я правильно понял ситуацию и ничего не пропустил.",
    "confirmYes": "Верно →",
    "confirmEdit": "Уточнить",
    "confirmEditCancel": "Свернуть",
    "confirmEditSend": "Отправить",
    "confirmEditPlaceholder": "Что добавить или уточнить?",
    "generate": "Сгенерировать",
    "generateTitle": "Собираю совет",
    "generateBody": "Собираю разбор",
    "generateHintMid": "Формулирую совет…",
    "generateHintLate": "Почти готово…",
    "resultTitle": "Готовый разбор",
    "resultSubtitle": "Главное видно сразу, остальное открывается по кнопкам.",
    "refineTitle": "Уточнить ответ",
    "refinePlaceholder": "Например: сделай мягче, без вопроса в конце…",
    "refineSend": "Применить",
    "refinePresets": [
      "Мягче",
      "Короче",
      "Смелее",
      "Ещё вариант"
    ],
    "refineCustom": "Своими словами",
    "finish": "Завершить сессию",
    "support": "Написать в поддержку",
    "thinking": "Анализирую контекст…",
    "stageCollect": "Собери контекст",
    "stageGenerate": "Собираю ответ",
    "emptyChat": "Тут появятся твои сообщения, скриншоты и голосовые.",
    "emptyChatTitle": "Добавь контекст",
    "emptyChatBody": "Текст, скриншот переписки или голосовое",
    "contextFallback": "Контекст",
    "confirmEyebrow": "Проверка перед генерацией",
    "confirmContextTitle": "Контекст",
    "confirmTimelineBody": "Сверь, что порядок, авторы и формулировки совпадают с тем, что ты добавил.",
    "confirmSimpleBody": "Проверь, что я правильно понял суть ситуации.",
    "confirmEmpty": "Контекст выглядит пустым. Вернись и добавь детали.",
    "confirmHelper": "Если что-то упущено, вернись и добавь.",
    "fragmentOne": "фрагмент",
    "fragmentFew": "фрагмента",
    "fragmentMany": "фрагментов",
    "readyForAnalysis": "Готово к разбору",
    "screenshot": "Скриншот",
    "voiceNote": "Голосовое",
    "message": "Сообщение",
    "userSelfShort": "Я",
    "userPeerShort": "Собеседник",
    "readOnly": "Эта сессия доступна только для просмотра.",
    "loadError": "Не получилось загрузить сессию.",
    "imagePendingTag": "[ИЗОБРАЖЕНИЕ]",
    "voicePendingTag": "[ГОЛОСОВОЕ]",
    "uploadHint": "Добавь роль и при необходимости дату автора.",
    "systemSaved": "Контекст добавлен.",
    "systemReady": "Контекст собран.",
    "systemRefined": "Ответ обновлен.",
    "sceneCollectTitle": "Новая консультация",
    "sceneCollectSubtitle": "Разбор ситуации",
    "voiceHoldToRecord": "Нажми для записи",
    "voiceRecording": "Запись",
    "voiceDecodeError": "Не получилось расшифровать голосовое.",
    "voiceCancelHint": "Свайп влево для отмены",
    "voiceCancelReady": "Отпустите, чтобы отменить",
    "microphoneDenied": "Разрешите микрофон в настройках браузера.",
    "sessionExitTitle": "Прервать сессию?",
    "sessionExitBody": "Незавершенный контекст будет потерян.",
    "share": "Поделиться",
    "newSession": "Новая сессия",
    "copy": "Копировать",
    "copied": "Скопировано",
    "copyInlineHint": "Главный блок ответа",
    "sessionMenu": "Параметры сессии",
    "resetSession": "Сбросить сессию",
    "bubbleDetails": "Детали фрагмента",
    "bubbleActions": "Действия с фрагментом",
    "deleteFragment": "Удалить",
    "deleteFragmentConfirm": "Удалить фрагмент",
    "deleteFragmentCancel": "Отмена",
    "deleteFragmentBody": "Фрагмент исчезнет из контекста и больше не попадет в проверку и генерацию.",
    "deleteFragmentError": "Не получилось удалить фрагмент.",
    "showMore": "Показать больше",
    "showLess": "Свернуть",
    "resultDetails": "Подробности ответа",
    "detailOpen": "Открыть блок",
    "stepLabels": [
      "Контекст",
      "Проверка",
      "Генерация",
      "Результат"
    ],
    "loadingTitle": "Собираю ответ",
    "loadingBody": "Покажу разбор прямо здесь, как только закончу.",
    "cards": {
      "primaryMessage": "Сообщение",
      "why": "Почему",
      "risks": "Риски",
      "avoid": "Избегать",
      "nextStep": "Следующий шаг",
      "simpleVersion": "Простой вариант",
      "alternatives": "Альтернативы",
      "diagnosis": "Диагноз",
      "leverage": "Точка рычага",
      "plan24": "План 24ч",
      "ifReply": "Если ответит",
      "ifNoReply": "Если не ответит",
      "template": "Шаблон",
      "emptyList": "Пока пусто."
    }
  },
  "support": {
    "title": "Поддержка",
    "subtitle": "Доступ, оплата, баг или другое",
    "placeholder": "Опиши проблему: доступ, оплата, баг, код входа...",
    "detailPlaceholder": "Опиши подробно…",
    "submit": "Отправить",
    "submitting": "Отправляем…",
    "successTitle": "Отправлено",
    "success": "Ответим через канал поддержки.",
    "homeCta": "На главную",
    "empty": "Сообщение пустое."
  },
  "profile": {
    "title": "Профиль",
    "plan": "План",
    "status": "Статус",
    "promoSection": "Промокод",
    "promoLabel": "Введите промокод",
    "promoPlaceholder": "Например, FG-AB12CD34",
    "promoSubmit": "Активировать код",
    "promoSubmitting": "Активируем...",
    "promoSuccess": "Промокод {code} активирован.",
    "promoError": "Не удалось активировать промокод.",
    "endSession": "Завершить активные сессии",
    "notifications": "Уведомления",
    "notificationsOff": "Выкл",
    "manageAccess": "Управление доступом",
    "resetSubtitle": "Сбросить незавершённые",
    "supportSubtitle": "Доступ, оплата, баги",
    "help": "Как это работает",
    "account": "Аккаунт",
    "assistance": "Помощь",
    "language": "Язык",
    "languageSubtitle": "По умолчанию английский",
    "languageEnglish": "English",
    "languageRussian": "Русский"
  },
  "offline": {
    "title": "Нет соединения",
    "body": "Оффлайн-скорлупа открылась, но для продолжения нужен интернет и доступ к аккаунту."
  },
  "staticPages": {
    "help": {
      "eyebrow": "Помощь",
      "title": "Как это работает",
      "body": "После входа начни новую консультацию, добавь контекст и получи разбор прямо в чате.",
      "cards": [
        {
          "title": "Добавь контекст",
          "body": "Напиши ситуацию, пришли скриншот или голосовое"
        },
        {
          "title": "Нажми «Готово»",
          "body": "Мы соберём всё в историю и покажем разбор в чате"
        },
        {
          "title": "Продолжай диалог",
          "body": "Новые сообщения и прошлые ответы учитываются дальше"
        }
      ],
      "resultSectionLabel": "Что ты получишь",
      "resultCards": [
        {
          "title": "Разбор ситуации",
          "body": "Что происходит и где сейчас главный рычаг"
        },
        {
          "title": "План действий",
          "body": "Что сделать в ближайшие 24 часа, если она ответит и если нет"
        },
        {
          "title": "Текст сообщения",
          "body": "Готовый вариант, который можно отправить или чуть адаптировать"
        }
      ],
      "replayOnboarding": "Показать обучение заново"
    },
    "premium": {
      "eyebrow": "Доступ",
      "title": "Один доступ для сайта и приложения",
      "body": "Оплата активирует один и тот же email на сайте, в checkout и в PWA.",
      "cards": [
        {
          "title": "Паритет",
          "body": "Советы и разбор ситуации доступны и на сайте, и в приложении."
        },
        {
          "title": "Возврат после оплаты",
          "body": "После оплаты просто вернись в приложение."
        }
      ]
    }
  },
  "toasts": {
    "defaultError": "Что-то пошло не так.",
    "sessionRestart": "Сессия потерялась. Начали новую.",
    "sessionConflict": "Эта сессия уже недоступна. Начали новую.",
    "sessionOwnershipMismatch": "Эта сессия принадлежит другому входу или устарела.",
    "startOver": "Начать заново",
    "forbidden": "Для этого экрана нужен активный доступ.",
    "authExpired": "Сессия входа истекла. Войди снова."
  }
} as const;

export const modeMessages: Record<SessionMode, { title: string; subtitle: string; accent: string }> = {
  "write_now": {
    "title": "Новая консультация",
    "subtitle": "Быстрый разбор прямо в чате",
    "accent": "write_now"
  },
  "analyze_case": {
    "title": "Новая консультация",
    "subtitle": "Диагноз, план и шаблон",
    "accent": "analyze_case"
  }
};
