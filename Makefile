COMPOSE := docker compose
DEV_COMPOSE := docker compose -f docker-compose.dev.yml --env-file .env
TEST_PROJECT ?= dating-quiz-mvp-test
TEST_COMPOSE := docker compose -p $(TEST_PROJECT) -f docker-compose.test-isolated.yml --env-file .env
DOCKER_REPO ?= artyom85/seranking-server
IMAGE_TAG ?= latest
BUILD_PLATFORM ?= linux/amd64
PUSH_RETRIES ?= 5
FULL_BUILD_FLAGS ?=# --pull --no-cache
BACKEND_IMAGE := $(DOCKER_REPO):backend-$(IMAGE_TAG)
FRONTEND_SITE_IMAGE := $(DOCKER_REPO):frontend-site-$(IMAGE_TAG)
FRONTEND_LANDING_IMAGE := $(DOCKER_REPO):frontend-landing-$(IMAGE_TAG)
FRONTEND_PAY_IMAGE := $(DOCKER_REPO):frontend-pay-$(IMAGE_TAG)
FRONTEND_APP_IMAGE := $(DOCKER_REPO):frontend-app-$(IMAGE_TAG)
BOT_IMAGE := $(DOCKER_REPO):bot-$(IMAGE_TAG)

define docker_push_retry
n=1; \
while [ $$n -le $(PUSH_RETRIES) ]; do \
	docker push "$(1)" && exit 0; \
	echo "Push failed for $(1) (attempt $$n/$(PUSH_RETRIES)); retrying..." >&2; \
	n=$$((n + 1)); \
	sleep 3; \
done; \
echo "Push failed for $(1) after $(PUSH_RETRIES) attempts" >&2; \
exit 1
endef

.PHONY: help up down restart build rebuild ps logs logs-frontend logs-backend logs-bot test-up test-down test-restart test-ps test-logs test-backend test-backend-local frontend-build backend-build bot-build backend-lint frontend-lint frontend-landing-lint frontend-pay-lint frontend-app-lint alembic-revision alembic-upgrade alembic-new dev-up dev-build dev-down dev-restart dev-logs dev-logs-backend dev-logs-frontend-site dev-logs-frontend-landing dev-logs-frontend-pay dev-logs-frontend-app dev-logs-bot dev-ps dev-frontend dev-frontend-site dev-frontend-landing dev-frontend-pay dev-frontend-app docker-login push-backend-image push-frontend-site-image push-frontend-landing-image push-frontend-pay-image push-frontend-app-image push-bot-image push-images install-hestia-proxy deploy

help:
	@echo "Available targets:"
	@echo "  make up                 - Start all services in background"
	@echo "  make down               - Stop and remove all services"
	@echo "  make restart            - Restart services"
	@echo "  make build              - Build all images"
	@echo "  make rebuild            - Rebuild all images without cache"
	@echo "  make ps                 - Show service status"
	@echo "  make logs               - Tail logs for all services"
	@echo "  make logs-frontend      - Tail site/landing/pay frontend logs"
	@echo "  make logs-backend       - Tail backend logs"
	@echo "  make logs-bot           - Tail bot logs"
	@echo "  make test-up            - Start isolated test stack (separate ports/volumes)"
	@echo "  make test-down          - Stop isolated test stack"
	@echo "  make test-restart       - Restart isolated test stack"
	@echo "  make test-ps            - Show isolated test stack status"
	@echo "  make test-logs          - Tail isolated test stack logs"
	@echo "  make frontend-build     - Build frontend image only"
	@echo "  make backend-build      - Build backend image only"
	@echo "  make bot-build          - Build bot image only"
	@echo "  make test-backend       - Run backend tests in isolated test stack"
	@echo "  make test-backend-local - Run backend tests with uv locally"
	@echo "  make backend-lint       - Run backend lint/type checks"
	@echo "  make alembic-revision MSG='desc' - Generate Alembic revision with autogenerate"
	@echo "  make alembic-upgrade    - Apply Alembic migrations to head"
	@echo "  make alembic-new MSG='desc' - Generate new revision and apply it"
	@echo "  make frontend-lint      - Run frontend lint/type checks"
	@echo "  make frontend-landing-lint - Run frontend-landing lint/type checks"
	@echo "  make frontend-pay-lint  - Run frontend-pay lint/type checks"
	@echo "  make frontend-app-lint  - Run frontend-app lint/type checks"
	@echo "  make dev-up             - Start backend+frontends+bot dev containers (with reload/HMR)"
	@echo "  make dev-build          - Build backend+frontends+bot dev images"
	@echo "  make dev-down           - Stop dev containers"
	@echo "  make dev-restart        - Restart dev containers"
	@echo "  make dev-ps             - Show dev service status"
	@echo "  make dev-logs           - Tail all dev logs"
	@echo "  make dev-logs-backend   - Tail backend dev logs"
	@echo "  make dev-logs-frontend-site - Tail frontend-site dev logs"
	@echo "  make dev-logs-frontend-landing - Tail frontend-landing dev logs"
	@echo "  make dev-logs-frontend-pay - Tail frontend-pay dev logs"
	@echo "  make dev-logs-frontend-app - Tail frontend-app dev logs"
	@echo "  make dev-logs-bot       - Tail bot dev logs"
	@echo "  make dev-frontend       - Run frontend locally with Vite HMR (without docker)"
	@echo "  make dev-frontend-site  - Run frontend-site locally with Vite HMR (without docker)"
	@echo "  make dev-frontend-landing - Run frontend-landing locally with Vite HMR (without docker)"
	@echo "  make dev-frontend-pay   - Run frontend-pay locally with Vite HMR (without docker)"
	@echo "  make dev-frontend-app   - Run frontend-app locally with Vite HMR (without docker)"
	@echo "  make docker-login       - Docker login using docker_login/docker_token from .env"
	@echo "  make push-backend-image - Build+push backend image ($(BUILD_PLATFORM))"
	@echo "  make push-frontend-site-image    - Build+push frontend-site image ($(BUILD_PLATFORM))"
	@echo "  make push-frontend-landing-image - Build+push frontend-landing image ($(BUILD_PLATFORM))"
	@echo "  make push-frontend-pay-image     - Build+push frontend-pay image ($(BUILD_PLATFORM))"
	@echo "  make push-frontend-app-image     - Build+push frontend-app image ($(BUILD_PLATFORM))"
	@echo "  make push-images        - Login and push target app images"
	@echo "  make install-hestia-proxy - Sync infra/hestia/ to prod and (re)install Apache reverse-proxy includes"
	@echo "  make deploy             - Push images, sync Hestia proxy config, restart remote app on clario-landing"

up:
	$(COMPOSE) build $(FULL_BUILD_FLAGS)
	$(COMPOSE) up -d --force-recreate

down:
	$(COMPOSE) down

restart: down up

build:
	$(COMPOSE) build $(FULL_BUILD_FLAGS)

rebuild:
	$(COMPOSE) build $(FULL_BUILD_FLAGS)

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=200

logs-frontend:
	$(COMPOSE) logs -f --tail=200 frontend-site frontend-landing frontend-pay frontend-app

logs-backend:
	$(COMPOSE) logs -f --tail=200 backend

logs-bot:
	$(COMPOSE) logs -f --tail=200 bot

test-up:
	$(TEST_COMPOSE) build $(FULL_BUILD_FLAGS)
	$(TEST_COMPOSE) up -d --force-recreate

test-down:
	$(TEST_COMPOSE) down

test-restart: test-down test-up

test-ps:
	$(TEST_COMPOSE) ps

test-logs:
	$(TEST_COMPOSE) logs -f --tail=200

frontend-build:
	$(COMPOSE) build $(FULL_BUILD_FLAGS) frontend-site frontend-landing frontend-pay frontend-app

backend-build:
	$(COMPOSE) build $(FULL_BUILD_FLAGS) backend

bot-build:
	$(COMPOSE) build $(FULL_BUILD_FLAGS) bot

test-backend:
	$(TEST_COMPOSE) run --rm -v $(CURDIR)/backend:/work backend sh -lc "cd /work && uv sync --dev && uv run pytest tests -q"

test-backend-local:
	cd backend && uv sync --dev && uv run pytest tests -q

backend-lint:
	cd backend && find ./app -name "*.py" | xargs uv run pyupgrade --py313-plus && \
	uv run python scripts/run_typecheck_ratcheting.py && \
	uv run ruff check ./app --fix && \
	uv run flake8 ./app --max-line-length 140 && \
	uv run mypy ./app

alembic-revision:
	@test -n "$(MSG)" || (echo "Usage: make alembic-revision MSG='your migration message'" && exit 1)
	$(DEV_COMPOSE) run --rm -v $(CURDIR)/backend:/work backend sh -lc "cd /work && uv sync --dev && uv run python -m alembic -c alembic.ini revision --autogenerate -m \"$(MSG)\""

alembic-upgrade:
	$(DEV_COMPOSE) run --rm -v $(CURDIR)/backend:/work backend sh -lc "cd /work && uv sync --dev && uv run python -m alembic -c alembic.ini upgrade head"

alembic-new: alembic-revision alembic-upgrade

frontend-lint:
	cd frontend_old && pnpm lint

frontend-landing-lint:
	cd frontend-landing && pnpm lint

frontend-pay-lint:
	cd frontend-pay && pnpm lint

frontend-app-lint:
	cd frontend-app && pnpm lint

dev-up:
	$(DEV_COMPOSE) up -d

dev-build:
	$(DEV_COMPOSE) build $(FULL_BUILD_FLAGS)

dev-down:
	$(DEV_COMPOSE) down

dev-restart: dev-down dev-up

dev-ps:
	$(DEV_COMPOSE) ps

dev-logs:
	$(DEV_COMPOSE) logs -f --tail=200

dev-logs-backend:
	$(DEV_COMPOSE) logs -f --tail=200 backend

dev-logs-frontend-site:
	$(DEV_COMPOSE) logs -f --tail=200 frontend-site

dev-logs-frontend-landing:
	$(DEV_COMPOSE) logs -f --tail=200 frontend-landing

dev-logs-frontend-pay:
	$(DEV_COMPOSE) logs -f --tail=200 frontend-pay

dev-logs-frontend-app:
	$(DEV_COMPOSE) logs -f --tail=200 frontend-app

dev-logs-bot:
	$(DEV_COMPOSE) logs -f --tail=200 bot

dev-frontend:
	cd frontend_old && pnpm install --no-frozen-lockfile && pnpm dev --host 0.0.0.0 --port 5173

dev-frontend-site:
	cd frontend-site && pnpm install --no-frozen-lockfile && pnpm dev --host 0.0.0.0 --port 5175

dev-frontend-landing:
	cd frontend-landing && pnpm install --no-frozen-lockfile && pnpm dev --host 0.0.0.0 --port 5174

dev-frontend-pay:
	cd frontend-pay && pnpm install --no-frozen-lockfile && pnpm dev --host 0.0.0.0 --port 5176

dev-frontend-app:
	cd frontend-app && pnpm install --no-frozen-lockfile && pnpm dev --host 0.0.0.0 --port 5177

docker-login:
	@docker_login="$$(grep -m1 '^docker_login=' .env | sed 's/^[^=]*=//')"; \
	docker_token="$$(grep -m1 '^docker_token=' .env | sed 's/^[^=]*=//')"; \
	test -n "$$docker_login" || (echo "docker_login is not set in .env" && exit 1); \
	test -n "$$docker_token" || (echo "docker_token is not set in .env" && exit 1); \
	printf '%s' "$$docker_token" | docker login -u "$$docker_login" --password-stdin

push-backend-image:
	docker build --platform "$(BUILD_PLATFORM)" $(FULL_BUILD_FLAGS) -f backend/Dockerfile -t "$(BACKEND_IMAGE)" .
	@$(call docker_push_retry,$(BACKEND_IMAGE))

push-frontend-site-image:
	docker build --platform "$(BUILD_PLATFORM)" \
		$(FULL_BUILD_FLAGS) \
		-f frontend-site/Dockerfile -t "$(FRONTEND_SITE_IMAGE)" .
	@$(call docker_push_retry,$(FRONTEND_SITE_IMAGE))

push-frontend-landing-image:
	@VITE_MOBI_SLON_URL="$$(grep -m1 '^VITE_MOBI_SLON_URL=' .env | sed 's/^[^=]*=//')"; \
	VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK="$$(grep -m1 '^VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK=' .env | sed 's/^[^=]*=//')"; \
	VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE="$$(grep -m1 '^VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE=' .env | sed 's/^[^=]*=//')"; \
	VITE_GOOGLE_ADS_ID="$$(grep -m1 '^VITE_GOOGLE_ADS_ID=' .env | sed 's/^[^=]*=//')"; \
	VITE_FB_PIXEL_ID="$$(grep -m1 '^VITE_FB_PIXEL_ID=' .env | sed 's/^[^=]*=//')"; \
	VITE_YANDEX_METRIKA_ID="$$(grep -m1 '^VITE_YANDEX_METRIKA_ID=' .env | sed 's/^[^=]*=//')"; \
	VITE_TRACKING_DEBUG="$$(grep -m1 '^VITE_TRACKING_DEBUG=' .env | sed 's/^[^=]*=//')"; \
	docker build --platform "$(BUILD_PLATFORM)" \
		$(FULL_BUILD_FLAGS) \
		--build-arg APP_SURFACE="landing" \
		--build-arg API_BASE_URL="https://api.flirto.guru" \
		--build-arg PAY_PUBLIC_BASE_URL="https://pay.flirto.guru" \
		--build-arg VITE_MOBI_SLON_URL="$$VITE_MOBI_SLON_URL" \
		--build-arg VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK="$$VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK" \
		--build-arg VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE="$$VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE" \
		--build-arg VITE_GOOGLE_ADS_ID="$$VITE_GOOGLE_ADS_ID" \
		--build-arg VITE_FB_PIXEL_ID="$$VITE_FB_PIXEL_ID" \
		--build-arg VITE_YANDEX_METRIKA_ID="$$VITE_YANDEX_METRIKA_ID" \
		--build-arg VITE_TRACKING_DEBUG="$$VITE_TRACKING_DEBUG" \
		-f frontend-landing/Dockerfile -t "$(FRONTEND_LANDING_IMAGE)" .
	@$(call docker_push_retry,$(FRONTEND_LANDING_IMAGE))

push-frontend-pay-image:
	@VITE_FB_PIXEL_ID="$$(grep -m1 '^VITE_FB_PIXEL_ID=' .env | sed 's/^[^=]*=//')"; \
	VITE_YANDEX_METRIKA_ID="$$(grep -m1 '^VITE_YANDEX_METRIKA_ID=' .env | sed 's/^[^=]*=//')"; \
	VITE_TRACKING_DEBUG="$$(grep -m1 '^VITE_TRACKING_DEBUG=' .env | sed 's/^[^=]*=//')"; \
	docker build --platform "$(BUILD_PLATFORM)" \
		$(FULL_BUILD_FLAGS) \
		--build-arg APP_SURFACE="pay" \
		--build-arg API_BASE_URL="https://api.flirto.guru" \
		--build-arg PAY_PUBLIC_BASE_URL="https://pay.flirto.guru" \
		--build-arg VITE_FB_PIXEL_ID="$$VITE_FB_PIXEL_ID" \
		--build-arg VITE_YANDEX_METRIKA_ID="$$VITE_YANDEX_METRIKA_ID" \
		--build-arg VITE_TRACKING_DEBUG="$$VITE_TRACKING_DEBUG" \
		-f frontend-pay/Dockerfile -t "$(FRONTEND_PAY_IMAGE)" .
	@$(call docker_push_retry,$(FRONTEND_PAY_IMAGE))

push-frontend-app-image:
	docker build --platform "$(BUILD_PLATFORM)" \
		$(FULL_BUILD_FLAGS) \
		--build-arg APP_SURFACE="app" \
		--build-arg API_BASE_URL="https://api.flirto.guru" \
		--build-arg PAY_PUBLIC_BASE_URL="https://pay.flirto.guru" \
		--build-arg APP_PUBLIC_BASE_URL="https://app.flirto.guru" \
		--build-arg LANDING_PUBLIC_BASE_URL="https://lp1.flirto.guru" \
		-f frontend-app/Dockerfile -t "$(FRONTEND_APP_IMAGE)" .
	@$(call docker_push_retry,$(FRONTEND_APP_IMAGE))

push-bot-image:
	docker build --platform "$(BUILD_PLATFORM)" $(FULL_BUILD_FLAGS) -f bot/Dockerfile -t "$(BOT_IMAGE)" .
	@$(call docker_push_retry,$(BOT_IMAGE))

push-images: docker-login push-backend-image push-frontend-site-image push-frontend-landing-image push-frontend-pay-image push-frontend-app-image push-bot-image

HESTIA_REMOTE_DIR ?= /tmp/flirto-hestia-install

install-hestia-proxy:
	ssh clario-landing 'mkdir -p $(HESTIA_REMOTE_DIR)'
	rsync -az --delete infra/hestia/ clario-landing:$(HESTIA_REMOTE_DIR)/
	ssh clario-landing 'sudo bash $(HESTIA_REMOTE_DIR)/install.sh'

deploy: push-images install-hestia-proxy
	ssh clario-landing 'cd /opt/flirto-guru && docker compose up -d --force-recreate'
