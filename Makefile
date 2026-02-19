COMPOSE := docker compose
DEV_COMPOSE := docker compose -f docker-compose.dev.yml
DOCKER_REPO ?= artyom85/seranking-server
IMAGE_TAG ?= latest
BUILD_PLATFORM ?= linux/amd64
PUSH_RETRIES ?= 5
BACKEND_IMAGE := $(DOCKER_REPO):backend-$(IMAGE_TAG)
FRONTEND_IMAGE := $(DOCKER_REPO):frontend-$(IMAGE_TAG)

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

.PHONY: help up down restart build rebuild ps logs logs-frontend logs-backend test-backend test-backend-local frontend-build backend-build dev-up dev-down dev-restart dev-logs dev-logs-backend dev-ps dev-frontend docker-login push-backend-image push-frontend-image push-images deploy

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
	@echo "  make frontend-build     - Build frontend image only"
	@echo "  make backend-build      - Build backend image only"
	@echo "  make test-backend       - Run backend tests with uv in container"
	@echo "  make test-backend-local - Run backend tests with uv locally"
	@echo "  make dev-up             - Start backend dev container (with reload)"
	@echo "  make dev-down           - Stop backend dev container"
	@echo "  make dev-restart        - Restart backend dev container"
	@echo "  make dev-ps             - Show backend dev service status"
	@echo "  make dev-logs           - Tail backend dev logs"
	@echo "  make dev-logs-backend   - Tail backend dev logs"
	@echo "  make dev-frontend       - Run frontend locally with Vite HMR"
	@echo "  make docker-login       - Docker login using docker_login/docker_token from .env"
	@echo "  make push-backend-image - Build+push backend image ($(BUILD_PLATFORM))"
	@echo "  make push-frontend-image- Build+push frontend image ($(BUILD_PLATFORM))"
	@echo "  make push-images        - Login and push both backend and frontend images"
	@echo "  make deploy             - Push images and restart remote app on clario-landing"

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart: down up

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=200

logs-frontend:
	$(COMPOSE) logs -f --tail=200 frontend

logs-backend:
	$(COMPOSE) logs -f --tail=200 backend

frontend-build:
	$(COMPOSE) build frontend

backend-build:
	$(COMPOSE) build backend

test-backend:
	$(COMPOSE) run --rm -v $(CURDIR)/backend:/work backend sh -lc "cd /work && uv sync --dev && uv run pytest tests -q"

test-backend-local:
	cd backend && uv sync --dev && uv run pytest tests -q

dev-up:
	$(DEV_COMPOSE) up -d --build

dev-down:
	$(DEV_COMPOSE) down

dev-restart: dev-down dev-up

dev-ps:
	$(DEV_COMPOSE) ps

dev-logs:
	$(DEV_COMPOSE) logs -f --tail=200 backend

dev-logs-backend:
	$(DEV_COMPOSE) logs -f --tail=200 backend

dev-frontend:
	cd frontend && pnpm install --no-frozen-lockfile && pnpm dev --host 0.0.0.0 --port 5173

docker-login:
	@set -a; . ./.env; set +a; \
	test -n "$$docker_login" || (echo "docker_login is not set in .env" && exit 1); \
	test -n "$$docker_token" || (echo "docker_token is not set in .env" && exit 1); \
	printf '%s' "$$docker_token" | docker login -u "$$docker_login" --password-stdin

push-backend-image:
	docker build --platform "$(BUILD_PLATFORM)" -f backend/Dockerfile -t "$(BACKEND_IMAGE)" .
	@$(call docker_push_retry,$(BACKEND_IMAGE))

push-frontend-image:
	@set -a; . ./.env; set +a; \
	docker build --platform "$(BUILD_PLATFORM)" \
		--build-arg VITE_MOBI_SLON_URL="$$VITE_MOBI_SLON_URL" \
		--build-arg VITE_MOBI_SLON_CAMPAIGN_KEY="$$VITE_MOBI_SLON_CAMPAIGN_KEY" \
		--build-arg VITE_FB_PIXEL_ID="$$VITE_FB_PIXEL_ID" \
		--build-arg VITE_TRACKING_DEBUG="$$VITE_TRACKING_DEBUG" \
		-f frontend/Dockerfile -t "$(FRONTEND_IMAGE)" .
	@$(call docker_push_retry,$(FRONTEND_IMAGE))

push-images: docker-login push-backend-image push-frontend-image

deploy: push-images
	ssh clario-landing 'cd /opt/seranking-app && docker compose up -d'
