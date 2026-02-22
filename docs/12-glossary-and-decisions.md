# 12. Glossary and Decisions

## Key decisions
1. Stripe Checkout + webhook как источник истины оплаты.
2. Цены в backend map (временное решение до доступа к Stripe Dashboard).
3. PostgreSQL как основная БД для payment/access/restore.
4. Email отключен на MVP (`log_only`).
5. Activation token одноразовый и валиден до активации.
6. Recovery через Telegram `/restore` + email OTP (OTP delivery сейчас через лог в non-prod).
7. Telegram bot вынесен в отдельный контейнер (aiogram), доступ к БД только через FastAPI.
8. Bot в prod работает через webhook path-secret и Apache reverse proxy.
9. Внутренние bot API защищены `X-Internal-Token`.

## Terms
- `payment_status`: бизнес-статус оплаты заказа.
- `fulfillment_status`: статус доставки доступа.
- `access_status`: статус активации доступа в Telegram.
