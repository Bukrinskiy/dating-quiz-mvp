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
1. `/pay` собирает email, запускает checkout в режиме `subscription`, вызывает `POST /api/payment/checkout-session`.
2. При клике на кнопку оплаты на `/pay` отправляется событие `transition_to_payment` в backend relay (`/api/events/mobi-slon`, alias: `/api/tracking/mobi-slon-event`); backend отправляет postback в MobiSлон.
3. Stripe checkout редиректит на `/pay/success?session_id=...` или `/pay/cancel`.
4. `/pay/success` показывает статус из `/api/payment/session-status` и ссылку в Telegram-бот.
5. `pay_success` отправляется server-side при `checkout.session.completed` (Stripe webhook) с `order.clickid`, без зависимости от браузера пользователя.
6. `/pay/manage` открывает Stripe customer portal.

## Restore UX
- Если доступа нет, пользователь пишет `/restore` в Telegram-боте.
