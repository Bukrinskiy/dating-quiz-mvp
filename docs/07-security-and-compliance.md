# 07. Security and Compliance

## Базовые принципы
- Секреты не хранятся в коде и документации.
- `.env.template` используется как эталон структуры переменных.
- Реальные `.env` значения не публикуются в PR, issue и docs.

## Secret Handling Policy
- `docker_token`, `FK_SECRET_1` и аналогичные параметры — только в защищенных хранилищах секретов.
- Логи не должны содержать секретные значения query/body/header.
- При ротации секретов обновляются окружения и runbook эксплуатации.

## Runtime Security Notes
- Compose-файлы публикуют сервисы на `127.0.0.1`, что снижает внешнюю экспозицию на хосте.
- Backend input hygiene:
  - `clickid` обрабатывается через sanitization (`[^a-zA-Z0-9_.-]` удаляются).
- Nginx проксирует `/api/*` только к внутреннему сервису `backend:8000`.

## Compliance/Governance (MVP)
Текущее состояние не содержит формализованной compliance-матрицы (GDPR/PII/data retention) в репозитории.

`TBD`:
- Зафиксировать policy хранения и удаления пользовательских данных.
- Зафиксировать legal basis для tracking пикселей по юрисдикциям.
- Добавить чеклист security review для релизов.

Как проверить:
1. Согласовать с legal/security владельцами.
2. Создать отдельный compliance документ и добавить ссылку в [AGENTS.md](../AGENTS.md).

## Related
- [06-deployment-and-environments](./06-deployment-and-environments.md)
- [08-observability-and-operations](./08-observability-and-operations.md)
