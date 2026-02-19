# 10. Frontend Journeys and Routing

## Основные маршруты SPA
Источник: `frontend/src/app/App.tsx`.

| Путь | Экран | Назначение |
|---|---|---|
| `/` | `LandingPage` | Вход в воронку |
| `/block-1` ... `/block-5` | `QuizBlockPage` | Вопросы по блокам |
| `/block-6` | `Block6Page` | Промежуточный экран |
| `/block-7` | `Block7Page` | Offer + CTA |
| `/pay` | `PayRedirectPage` | Сообщение о недоступной оплате |
| `/terms.html` | `LegalPage` | Пользовательское соглашение |
| `/privacy-policy.html` | `LegalPage` | Политика конфиденциальности |
| `/refund-policy.html` | `LegalPage` | Политика возврата |
| `*` | redirect на `/` | fallback |

## User journey (MVP)
1. Пользователь открывает `/`.
2. CTA ведет на `/block-1`.
3. После блоков 1-5 переход на `/block-6`, затем `/block-7`.
4. CTA на `/block-7` ведет на `/pay`.
5. `/pay` показывает недоступность платежей (без backend redirect).

## Юридические страницы
- В SPA: рендерятся компонентом `LegalPage` из i18n контента.
- В legacy: существуют отдельные root-файлы `terms.html`, `privacy-policy.html`, `refund-policy.html`.

Текущее решение поддерживает те же URL-пути в SPA для совместимости ссылок/рекламы.

## Tracking и `VITE_*`
Ключевые переменные:
- `VITE_MOBI_SLON_URL`
- `VITE_MOBI_SLON_CAMPAIGN_KEY`
- `VITE_FB_PIXEL_ID`
- `VITE_TRACKING_DEBUG`

Порядок чтения конфигурации:
1. `window.__APP_CONFIG__` (runtime конфиг от Nginx entrypoint).
2. `import.meta.env` (build-time fallback).

## Legacy/Static маршруты
- Корневой `index.html` и `blocks/*.html` образуют отдельный статический flow на `assets/*`.
- Статический flow рассматривается как legacy артефакт и не является основным SPA runtime.

См. также: [03-repository-structure](./03-repository-structure.md), [02-architecture](./02-architecture.md).
