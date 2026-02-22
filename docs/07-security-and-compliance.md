# 07. Security and Compliance

## Secrets policy
- Не коммитить `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ACCESS_TOKEN_SECRET`, `TELEGRAM_BOT_TOKEN`.
- Не коммитить `BOT_INTERNAL_TOKEN`, `BOT_WEBHOOK_PATH_SECRET`.
- Не коммитить `SMTP_PASSWORD`.
- Хранить секреты только в окружении/secret manager.

## Payment security rules
1. Оплата подтверждается только webhook событием.
2. Подпись webhook обязательна.
3. Повторные webhook события должны быть идемпотентны.
4. Internal bot endpoints (`/api/bot/*`) разрешены только с `X-Internal-Token`.

## Access security rules
- Activation token одноразовый.
- После активации токен немедленно инвалидируется.
- Restore требует OTP.

## MVP exception
- Email delivery отключена (`EMAIL_DELIVERY_MODE=log_only`).
- OTP может логироваться только в non-prod (`LOG_OTP_IN_NONPROD=true`).
- В prod использовать `LOG_OTP_IN_NONPROD=false`.
