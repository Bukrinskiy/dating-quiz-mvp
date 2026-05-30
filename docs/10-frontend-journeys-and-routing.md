# 10. Frontend Journeys and Routing

## Main funnel routes
- `/` -> первый экран квиза без редиректа, в runtime рендерится английская версия
- `/en` -> первый экран квиза с каноническим языком
- `/ru` и другие `/:lang` compatibility entry -> redirect на эквивалентный `/en` URL
- Основной новый квиз:
  - `/en/quiz`
  - `/en/quiz/:step`
  - `/en/quiz/email/:uuid`
- Payment surface:
  - `/en/checkout/:uuid`
  - `/en/pay/success`
  - `/en/pay/cancel`
  - `/en/pay/manage`
- App surface:
  - `/login`
  - `/paywall`
  - `/app`
  - `/app/session/:sessionId`
  - `/app/support`
  - `/app/profile`
  - `/legal/terms`
  - `/legal/privacy`
  - `/legal/refund`
  - `/help`
  - `/premium`
- Legal:
  - `/en/terms.html`
  - `/en/privacy-policy.html`
  - `/en/refund-policy.html`
- Переходные alias:
  - `/quiz/*` -> redirect на `/en/quiz/*`
  - `/ru/*` -> redirect на matching `/en/*` с сохранением query params
  - `/:lang/quiz/checkout/:uuid` -> redirect на `/en/checkout/:uuid`
- Удаленные legacy URL:
  - `/old-quiz/*`, `/block-*`, `/pay*`, `/terms.html`, `/privacy-policy.html`, `/refund-policy.html` -> not found.
- `*` -> redirect `/`

## Payment UX
1. Пользователь проходит шаги `/en/quiz/:step`.
2. На результате создается session (`POST /api/session/create`) и переход в `/en/quiz/email/:uuid`.
3. `/en/quiz/email/:uuid` сохраняет email (`POST /api/session/update-email`) и делает handoff в `pay` на `/en/checkout/:uuid`.
4. `/en/checkout/:uuid` загружает планы (`POST /api/session/get-plan-data`) и создает Stripe intent (`POST /api/session/create-payment-intent`).
5. Переходный alias `/:lang/quiz/checkout/:uuid` редиректит в canonical pay route `/en/checkout/:uuid`.
6. В popup checkout рендерятся Stripe Express Checkout + Payment Element; подтверждение проходит через `stripe.confirmPayment`.
7. После подтверждения пользователь попадает на `/en/pay/success?order_id=...&session_id=...`.
8. `/en/pay/success` показывает статус из `/api/payment/order-status` или `/api/payment/session-status` и ссылку в `app.flirto.guru`.
9. `pay_success` отправляется server-side из Stripe webhook после успешной оплаты.
10. `/en/pay/manage` открывает Stripe customer portal.

## Restore UX
- Если доступа нет, пользователь пишет `/restore` в Telegram-боте.
- Shared entitlement для app считается по email и может приходить как из оплаченного `order`, так и из redeemed `access_code`.

## App PWA UX
1. Пользователь открывает `app.flirto.guru/login`.
2. Вводит email, получает login code через `POST /api/app/auth/email-code/request`.
3. Подтверждает код через `POST /api/app/auth/email-code/confirm`.
4. Если entitlement активен, попадает в `/app`.
5. Если entitlement неактивен, попадает в `/paywall`; CTA создает lightweight quiz session с fixed app attribution и уводит на `LANDING_PUBLIC_BASE_URL/en/quiz/email/:uuid?email=...`, откуда submit продолжает стандартный pay checkout handoff.
   - Если пользователь открывает tab `Access` уже с активным entitlement, `/paywall` рендерит статус `Access active` / `Доступ активен`, показывает `expires_at` или `plan`, CTA `Manage access` ведёт в pay manage flow, secondary CTA ведёт в поддержку.
   - В `/app/profile` inactive entitlement тоже показывается явно: верхний badge не зеленый, вместо `Manage access` показывается CTA оплаты, который запускает тот же checkout flow, что и во вкладке `Access`.
   - В `/app/profile` пользователь может ввести promo code; успешный redeem сразу переключает app status на `Promo` и открывает paid-gated app flow без Stripe.
6. В `/app` видит упрощённый mobile-first home: header c логотипом, верхнюю навигацию (`Advice`, `Access`, `Help`, `Profile` по умолчанию; `Совет`, `Доступ`, `Помощь`, `Профиль` после ручного выбора русского), один главный CTA, onboarding overlay при первом входе и блок recent sessions.
   - Onboarding overlay теперь глобальный для auth-shell: он может открываться не только поверх `/app`, но и поверх `/paywall`, `/app/profile`, `/app/support` и других auth-маршрутов app shell.
   - Если app открыт не в standalone/PWA mode, первым onboarding экраном показывается device-aware инструкция установки: CTA `Install` пытается открыть native browser install prompt, на iOS — share sheet, а если автоматический install API недоступен, показывает ручную browser-инструкцию для текущей платформы.
   - Уже прошедшим onboarding пользователям install hint показывается отдельно только один раз и только вне standalone/PWA mode.
   - `/app/profile` в секции помощи содержит CTA replay onboarding, который сбрасывает onboarding/install hint flags и открывает текущий auth-маршрут с `?onboarding=1`; для профиля это `/app/profile?onboarding=1`.
7. App shell использует prototype PWA chrome: sticky header, верхнюю pill-nav вместо bottom tab bar, safe-area paddings и persistent light/dark theme choice.
8. Язык приложения по умолчанию всегда `en`, независимо от browser locale, timezone, URL или client hints; изменить язык можно только в `/app/profile`, где выбор сохраняется в `user.locale`.
9. Tab `Advice` / `Совет` всегда возвращает пользователя на `/app`.
10. Session flow работает как single-route поток `/app/session/:sessionId`, но визуально остаётся одним чат-экраном без отдельных экранов `confirm / generate / result`.
11. После нажатия `Done` / `Готово` frontend автоматически выполняет `closeBatch -> confirmContext(confirm:yes) -> generate`, показывает inline loading bubble в чате и затем заменяет её готовым ответом.
12. Ошибка `Session ownership mismatch` означает, что текущий `session_id` принадлежит другому app login или устаревшему локальному target; в этом случае пользователь возвращается на `/app`, а старая session не рестартуется автоматически.
13. Возврат к session backend-backed: home `Недавние` показывает реальные app sessions, а повторное открытие session восстанавливает сообщения, `context_preview`, последний result payload и stage.
14. Closed sessions открываются в read-only режиме: содержимое и результат видны, но новые сообщения/generate/refine недоступны.
15. В `collect` доступны prototype-style bubbles, sticky composer, камера (`capture="environment"`), галерея, file-audio и hold-to-record voice capture через `MediaRecorder`.
16. В `collect` каждый фрагмент контекста можно удалить до генерации: быстрым свайпом по bubble или через long-press/context menu с action sheet; после удаления счётчик `Готово к проверке` и список сообщений обновляются сразу.
17. Session flow имеет две presentation-mode версии:
   - mobile: максимальная parity с `/mvp`
   - desktop: adaptive wide layout без phone-frame, но с тем же visual language и stage hierarchy
18. Главный assistant response рендерится прямо в chat timeline: показывается preview из `message_template` или fallback `diagnosis`, с inline control `Показать больше`.
19. Остальные секции ответа (`Диагноз`, `Точка рычага`, `План 24ч`, `Если ответит`, `Если не ответит`, `Избегать`) открываются кнопками под сообщением в custom bottom sheet.
20. Refine остаётся в том же сообщении: preset chips и custom prompt обновляют текущий assistant bubble, а не переводят пользователя на отдельный экран.
21. PWA shell уважает safe areas, dark mode и offline bootstrap screen; prototype tweak/dev panel не поставляется в production.
22. `frontend-app` использует один canonical PWA manifest с `standalone` display, `start_url=/app` и unified iPhone/Android install icons; `frontend-app` на мобильных устройствах и в in-app webview запускается с locked viewport: pinch-to-zoom и iOS gesture zoom отключены, чтобы shell ощущался ближе к native app.
23. Legal-документы используют единый shared source of truth для `frontend-landing`, `frontend-pay`, `frontend-app` и `frontend-site`; в app они открываются на native маршрутах `/legal/*`, а pay по-прежнему ведет на публичные web legal pages.
