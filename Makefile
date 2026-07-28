ENV_FILE ?= frontend/.env.production


COMPOSE = docker compose --env-file $(ENV_FILE)


.PHONY: up down logs restart build 


up:
	$(COMPOSE) up -d


down:
	$(COMPOSE) down


logs:
	$(COMPOSE) logs -f


restart:
	$(COMPOSE) down
	$(COMPOSE) up -d


build:
	$(COMPOSE) build


