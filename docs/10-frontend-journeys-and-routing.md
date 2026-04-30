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
8. `/en/pay/success` показывает статус из `/api/payment/order-status` или `/api/payment/session-status` и ссылку в Telegram-бот.
9. `pay_success` отправляется server-side из Stripe webhook после успешной оплаты.
10. `/en/pay/manage` открывает Stripe customer portal.

## Restore UX
- Если доступа нет, пользователь пишет `/restore` в Telegram-боте.
- Shared entitlement для app считается по email и может приходить как из оплаченного `order`, так и из admin-issued `manual_access_grant`.

## App PWA UX
1. Пользователь открывает `app.flirto.guru/login`.
2. Вводит email, получает login code через `POST /api/app/auth/email-code/request`.
3. Подтверждает код через `POST /api/app/auth/email-code/confirm`.
4. Если entitlement активен, попадает в `/app`.
5. Если entitlement неактивен, попадает в `/paywall` и уходит на `pay.flirto.guru`.
6. В `/app` видит упрощённый mobile-first home: header c логотипом, верхнюю навигацию (`Совет`, `Доступ`, `Помощь`, `Профиль`), один главный CTA `ПАМАГИТИ`, onboarding overlay при первом входе и блок recent sessions.
7. App shell использует prototype PWA chrome: sticky header, верхнюю pill-nav вместо bottom tab bar, safe-area paddings и persistent light/dark theme choice.
8. Tab `Совет` всегда возвращает пользователя на `/app`.
9. Session flow работает как single-route поток `/app/session/:sessionId`, но визуально остаётся одним чат-экраном без отдельных экранов `confirm / generate / result`.
10. После нажатия `Готово` frontend автоматически выполняет `closeBatch -> confirmContext(confirm:yes) -> generate`, показывает inline loading bubble в чате и затем заменяет её готовым ответом.
11. Ошибка `Session ownership mismatch` означает, что текущий `session_id` принадлежит другому app login или устаревшему локальному target; в этом случае пользователь возвращается на `/app`, а старая session не рестартуется автоматически.
12. Возврат к session backend-backed: home `Недавние` показывает реальные app sessions, а повторное открытие session восстанавливает сообщения, `context_preview`, последний result payload и stage.
13. Closed sessions открываются в read-only режиме: содержимое и результат видны, но новые сообщения/generate/refine недоступны.
14. В `collect` доступны prototype-style bubbles, sticky composer, камера (`capture="environment"`), галерея, file-audio и hold-to-record voice capture через `MediaRecorder`.
15. В `collect` каждый фрагмент контекста можно удалить до генерации: быстрым свайпом по bubble или через long-press/context menu с action sheet; после удаления счётчик `Готово к проверке` и список сообщений обновляются сразу.
16. Session flow имеет две presentation-mode версии:
   - mobile: максимальная parity с `/mvp`
   - desktop: adaptive wide layout без phone-frame, но с тем же visual language и stage hierarchy
17. Главный assistant response рендерится прямо в chat timeline: показывается preview из `message_template` или fallback `diagnosis`, с inline control `Показать больше`.
18. Остальные секции ответа (`Диагноз`, `Точка рычага`, `План 24ч`, `Если ответит`, `Если не ответит`, `Избегать`) открываются кнопками под сообщением в custom bottom sheet.
19. Refine остаётся в том же сообщении: preset chips и custom prompt обновляют текущий assistant bubble, а не переводят пользователя на отдельный экран.
20. PWA shell уважает safe areas, dark mode и offline bootstrap screen; prototype tweak/dev panel не поставляется в production.
21. `frontend-app` использует один canonical PWA manifest с `standalone` display, `start_url=/app` и unified iPhone/Android install icons; `frontend-app` на мобильных устройствах и в in-app webview запускается с locked viewport: pinch-to-zoom и iOS gesture zoom отключены, чтобы shell ощущался ближе к native app.
