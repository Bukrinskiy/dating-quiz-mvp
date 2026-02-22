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
FRONTEND_IMAGE := $(DOCKER_REPO):frontend-$(IMAGE_TAG)
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

.PHONY: help up down restart build rebuild ps logs logs-frontend logs-backend logs-bot test-up test-down test-restart test-ps test-logs test-backend test-backend-local frontend-build backend-build bot-build backend-lint frontend-lint alembic-revision alembic-upgrade alembic-new dev-up dev-down dev-restart dev-logs dev-logs-backend dev-logs-frontend dev-logs-bot dev-ps dev-frontend docker-login push-backend-image push-frontend-image push-bot-image push-images deploy

help:
	@echo "Available targets:"
	@echo "  make up                 - Start all services in background"
	@echo "  make down               - Stop and remove all services"
	@echo "  make restart            - Restart services"
	@echo "  make build              - Build all images"
	@echo "  make rebuild            - Rebuild all images without cache"
	@echo "  make ps                 - Show service status"
	@echo "  make logs               - Tail logs for all services"
	@echo "  make logs-frontend      - Tail frontend logs"
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
	@echo "  make dev-up             - Start backend+frontend+bot dev containers (with reload/HMR)"
	@echo "  make dev-down           - Stop dev containers"
	@echo "  make dev-restart        - Restart dev containers"
	@echo "  make dev-ps             - Show dev service status"
	@echo "  make dev-logs           - Tail all dev logs"
	@echo "  make dev-logs-backend   - Tail backend dev logs"
	@echo "  make dev-logs-frontend  - Tail frontend dev logs"
	@echo "  make dev-logs-bot       - Tail bot dev logs"
	@echo "  make dev-frontend       - Run frontend locally with Vite HMR (without docker)"
	@echo "  make docker-login       - Docker login using docker_login/docker_token from .env"
	@echo "  make push-backend-image - Build+push backend image ($(BUILD_PLATFORM))"
	@echo "  make push-frontend-image- Build+push frontend image ($(BUILD_PLATFORM))"
	@echo "  make push-images        - Login and push both backend and frontend images"
	@echo "  make deploy             - Push images and restart remote app on clario-landing"

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
	$(COMPOSE) logs -f --tail=200 frontend

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
	$(COMPOSE) build $(FULL_BUILD_FLAGS) frontend

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
	cd frontend && pnpm lint

dev-up:
	$(DEV_COMPOSE) build $(FULL_BUILD_FLAGS)
	$(DEV_COMPOSE) up -d --force-recreate

dev-down:
	$(DEV_COMPOSE) down

dev-restart: dev-down dev-up

dev-ps:
	$(DEV_COMPOSE) ps

dev-logs:
	$(DEV_COMPOSE) logs -f --tail=200

dev-logs-backend:
	$(DEV_COMPOSE) logs -f --tail=200 backend

dev-logs-frontend:
	$(DEV_COMPOSE) logs -f --tail=200 frontend

dev-logs-bot:
	$(DEV_COMPOSE) logs -f --tail=200 bot

dev-frontend:
	cd frontend && pnpm install --no-frozen-lockfile && pnpm dev --host 0.0.0.0 --port 5173

docker-login:
	@docker_login="$$(grep -m1 '^docker_login=' .env | sed 's/^[^=]*=//')"; \
	docker_token="$$(grep -m1 '^docker_token=' .env | sed 's/^[^=]*=//')"; \
	test -n "$$docker_login" || (echo "docker_login is not set in .env" && exit 1); \
	test -n "$$docker_token" || (echo "docker_token is not set in .env" && exit 1); \
	printf '%s' "$$docker_token" | docker login -u "$$docker_login" --password-stdin

push-backend-image:
	docker build --platform "$(BUILD_PLATFORM)" $(FULL_BUILD_FLAGS) -f backend/Dockerfile -t "$(BACKEND_IMAGE)" .
	@$(call docker_push_retry,$(BACKEND_IMAGE))

push-frontend-image:
	@VITE_MOBI_SLON_URL="$$(grep -m1 '^VITE_MOBI_SLON_URL=' .env | sed 's/^[^=]*=//')"; \
	VITE_MOBI_SLON_CAMPAIGN_KEY="$$(grep -m1 '^VITE_MOBI_SLON_CAMPAIGN_KEY=' .env | sed 's/^[^=]*=//')"; \
	VITE_FB_PIXEL_ID="$$(grep -m1 '^VITE_FB_PIXEL_ID=' .env | sed 's/^[^=]*=//')"; \
	VITE_TRACKING_DEBUG="$$(grep -m1 '^VITE_TRACKING_DEBUG=' .env | sed 's/^[^=]*=//')"; \
	docker build --platform "$(BUILD_PLATFORM)" \
		$(FULL_BUILD_FLAGS) \
		--build-arg VITE_MOBI_SLON_URL="$$VITE_MOBI_SLON_URL" \
		--build-arg VITE_MOBI_SLON_CAMPAIGN_KEY="$$VITE_MOBI_SLON_CAMPAIGN_KEY" \
		--build-arg VITE_FB_PIXEL_ID="$$VITE_FB_PIXEL_ID" \
		--build-arg VITE_TRACKING_DEBUG="$$VITE_TRACKING_DEBUG" \
		-f frontend/Dockerfile -t "$(FRONTEND_IMAGE)" .
	@$(call docker_push_retry,$(FRONTEND_IMAGE))

push-bot-image:
	docker build --platform "$(BUILD_PLATFORM)" $(FULL_BUILD_FLAGS) -f bot/Dockerfile -t "$(BOT_IMAGE)" .
	@$(call docker_push_retry,$(BOT_IMAGE))

push-images: docker-login push-backend-image push-frontend-image push-bot-image

deploy: push-images
	ssh clario-landing 'cd /opt/seranking-app && docker compose pull && docker compose up -d --force-recreate'
