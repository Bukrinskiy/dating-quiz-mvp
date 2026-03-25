# 10. Frontend Journeys and Routing

## Main funnel routes
- `/`
- `/block-1` ... `/block-7`
- `/pay`
- `/pay/success`
- `/pay/cancel`
- `/pay/manage`
- `/terms.html`
- `/privacy-policy.html`
- `/refund-policy.html`
- `*` -> redirect `/`

## Hero on `/`
- Desktop-first лендинг стилизован под proxy-quiz: слева mockup с warning-чипами и карточкой параметров, справа value proposition + CTA.
- CTA `Подобрать прокси` (`Pick proxies` для EN) отправляет `hero_cta_click`, затем ведет на `/block-1` с сохранением `clickid`.

## Payment UX
1. `/pay` загружает тарифы через `GET /api/payment/plans`, показывает выбор `sub_weekly`, `sub_monthly`, `sub_quarterly`, затем собирает email.
2. По умолчанию выделяется backend-configured default plan; frontend не хардкодит цены и бейджи.
3. При клике на CTA на `/pay` отправляется событие `transition_to_payment` в backend relay (`/api/events/mobi-slon`, alias: `/api/tracking/mobi-slon-event`).
4. Frontend вызывает `POST /api/payment/checkout-session` с выбранным `plan`, `email`, `clickid`, `locale`, optional `telegram_chat_id`.
5. Stripe checkout редиректит на `/pay/success?session_id=...` или `/pay/cancel`.
6. `/pay/success` показывает статус из `/api/payment/session-status` и ссылку в Telegram-бот.
7. `pay_success` отправляется server-side при `checkout.session.completed` (Stripe webhook) с `order.clickid` и payout фактического плана.
8. `/pay/manage` открывает Stripe customer portal.

## Restore UX
- Если доступа нет, пользователь пишет `/restore` в Telegram-боте.
