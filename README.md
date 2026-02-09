# Dating Quiz MVP (HTML/CSS/JS)

Это MVP-структура квиза только на HTML, CSS и vanilla JavaScript.

## Как открыть

1. Откройте `index.html` двойным кликом в браузере.
2. Никакие серверы и сборка не нужны.

## Переходы по блокам

- `index.html` → `block-1.html`
- `block-1.html` → `block-2.html`
- `block-2.html` → `block-3.html`
- `block-3.html` → `block-4.html`
- `block-4.html` → `block-5.html`
- `block-5.html` → `block-6.html`
- `block-6.html` → `block-7.html`

Внутри `block-6.html` и `block-7.html` экраны переключаются через JavaScript без смены URL.

## Что входит в MVP

- 8 HTML-страниц с заглушками контента.
- Общие стили в `assets/styles.css`.
- Минимальная логика в `assets/app.js`:
  - переключение экранов;
  - показ вопросов по одному;
  - FAQ-аккордеон;
  - заглушка трекинга событий.
