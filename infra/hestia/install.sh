#!/usr/bin/env bash
#
# Идемпотентно ставит Apache `_custom` инклуды для всех доменов Flirto на
# HestiaCP-хост. Запускается как root на проде (обычно через `make
# install-hestia-proxy`, который rsync'ает каталог в /tmp/... и вызывает
# `sudo bash`).
#
# Файлы лежат в `domains/<domain>/apache2.{ssl.}conf_custom` и копируются
# в `/home/admin/conf/web/<domain>/`. Hestia подцепляет их через
# `IncludeOptional .../apache2.{ssl.}conf_*` в сгенерированных vhost'ах.
#
# Скрипт не создаёт домены в Hestia. Если каталога
# `/home/admin/conf/web/<domain>/` нет — домен пропускается с предупреждением.

set -euo pipefail

HESTIA_USER="admin"
HESTIA_GROUP="admin"
HESTIA_WEB_CONF="/home/${HESTIA_USER}/conf/web"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAINS_DIR="${SCRIPT_DIR}/domains"

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: must run as root (use sudo)." >&2
    exit 1
fi

if [[ ! -d "${DOMAINS_DIR}" ]]; then
    echo "ERROR: domains dir not found: ${DOMAINS_DIR}" >&2
    exit 1
fi

updated=()
skipped=()

for domain_path in "${DOMAINS_DIR}"/*/; do
    domain="$(basename "${domain_path}")"
    target_dir="${HESTIA_WEB_CONF}/${domain}"

    if [[ ! -d "${target_dir}" ]]; then
        echo "SKIP  ${domain}: ${target_dir} does not exist (domain not configured in Hestia)"
        skipped+=("${domain}")
        continue
    fi

    for src in "${domain_path}"apache2*.conf_custom; do
        [[ -e "${src}" ]] || continue
        fname="$(basename "${src}")"
        dst="${target_dir}/${fname}"

        install -o "${HESTIA_USER}" -g "${HESTIA_GROUP}" -m 0644 "${src}" "${dst}"
        echo "OK    ${domain}/${fname}"
    done

    updated+=("${domain}")
done

echo
echo "Validating Apache config..."
if ! apache2ctl configtest 2>&1; then
    echo "ERROR: apache2ctl configtest failed; NOT reloading." >&2
    exit 2
fi

echo "Reloading Apache..."
systemctl reload apache2

echo "Validating nginx config..."
if nginx -t 2>&1; then
    systemctl reload nginx
    echo "Reloaded nginx."
else
    echo "WARNING: nginx -t failed; not reloading nginx." >&2
fi

echo
echo "Updated: ${updated[*]:-none}"
if [[ ${#skipped[@]} -gt 0 ]]; then
    echo "Skipped (not in Hestia): ${skipped[*]}"
fi
