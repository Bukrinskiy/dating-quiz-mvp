# Hestia edge-proxy config

Этот каталог — source of truth для Apache reverse-proxy инклудов на проде
(`clario-landing`, HestiaCP). Они переводят публичный трафик с доменов
`*.flirto.guru` на докер-контейнеры приложения.

## Зачем

Hestia генерит дефолтные Apache vhost'ы, которые отдают пустой
`/home/admin/web/<domain>/public_html` (или Hestia-шный "Coming Soon"). Чтобы
домены реально проксировали в наш стек, надо положить в
`/home/admin/conf/web/<domain>/` файлы `apache2.ssl.conf_custom` (и
`apache2.conf_custom` для HTTP), которые Hestia подцепляет через
`IncludeOptional .../apache2.{ssl.}conf_*` в своих шаблонах.

Эти файлы хранились только на проде и однажды (2026-05-30 02:23 UTC)
исчезли при пересборке доменов — весь прод лёг "белым экраном". Теперь они
живут в репо, ревьюятся и накатываются автоматически.

## Структура

```
domains/<domain>/
    apache2.ssl.conf_custom    # для :443 vhost
    apache2.conf_custom        # для :80 vhost (на случай ещё-не-HSTS-обновлённого клиента)
```

Маппинг порт↔сервис — в [docker-compose.yml](../../compose.yml) на проде и в
[Makefile](../../Makefile). Текущий маппинг:

| Домен                                | Порт      | Сервис             |
|--------------------------------------|-----------|--------------------|
| `app.flirto.guru`                    | `18085`   | `frontend-app`     |
| `api.flirto.guru`                    | `18000`   | `backend`          |
| `pay.flirto.guru`                    | `18184`   | `frontend-pay`     |
| `flirto.guru` / `www.flirto.guru`    | `18182`   | `frontend-site`    |
| `lp1.flirto.guru` / `lp2.flirto.guru`| `18183`   | `frontend-landing` |

`flirto.guru` дополнительно проксирует `/tg/webhook/` → `127.0.0.1:18081/webhook/`
(бот, `BOT_MODE=webhook`, `APP_PUBLIC_BASE_URL=https://flirto.guru` для сервиса
`bot`).

## Как накатить

```bash
make install-hestia-proxy
```

Это rsync'нет `infra/hestia/` на прод в `/tmp/flirto-hestia-install/` и
запустит [install.sh](install.sh) как root. Скрипт идемпотентный —
безопасно гонять сколько угодно раз.

`install-hestia-proxy` также вызывается из `make deploy`, так что каждый
деплой восстанавливает edge-конфиг.

## Как добавить новый домен

1. Создать домен в Hestia стандартным путём (UI или CLI).
2. Добавить каталог `domains/<new.domain>/` с двумя файлами по аналогии с
   соседними.
3. Закоммитить и `make install-hestia-proxy`.

Если `/home/admin/conf/web/<new.domain>/` не существует на проде, install.sh
этот домен пропустит с предупреждением — Hestia сначала должна знать о домене.
