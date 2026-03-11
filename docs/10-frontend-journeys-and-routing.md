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

## Payment UX
1. `/pay` загружает тарифы через `GET /api/payment/plans`, показывает выбор `sub_weekly`, `sub_monthly`, `sub_yearly`, затем собирает email.
2. Поле промокода скрыто по умолчанию и раскрывается кнопкой; если в URL есть `promo`, поле открывается сразу.
3. При выборе тарифа отправляются MobiSлон-события: `pay_plan_weekly_selected`, `pay_plan_monthly_selected`, `pay_plan_yearly_selected`.
4. При первом вводе валидного email отправляется событие `pay_email_entered`.
5. После выбора тарифа + валидного `email` (on blur) frontend автоматически вызывает `POST /api/payment/intent` с `plan`, `email`, `clickid`, `locale`, optional `telegram_chat_id`.
6. При первом успешном auto-intent отправляется событие `transition_to_payment` в backend relay (`/api/events/mobi-slon`, alias: `/api/tracking/mobi-slon-event`).
7. На `/pay` рендерятся Stripe Express Checkout (Apple/Google Pay, если поддерживается) и Payment Element; подтверждение проходит через `stripe.confirmPayment`.
8. После подтверждения пользователь попадает на `/pay/success?order_id=...`.
9. `/pay/success` показывает статус из `/api/payment/order-status` (legacy fallback: `/api/payment/session-status`) и ссылку в Telegram-бот.
10. `pay_success` отправляется server-side из Stripe webhook после успешной оплаты.
11. `/pay/manage` открывает Stripe customer portal.

## Restore UX
- Если доступа нет, пользователь пишет `/restore` в Telegram-боте.
