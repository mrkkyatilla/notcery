# Local development shortcuts (see README.md)

DC := docker compose -f infra/docker-compose.yml

.PHONY: up down migrate test shell logs

up:
	$(DC) up -d

down:
	$(DC) down

# After Django is scaffolded, create venv, install deps, then:
migrate:
	cd backend && python manage.py migrate

test:
	cd backend && pytest

# Database shell until backend service is enabled in compose
shell:
	$(DC) exec postgres psql -U notcery -d notcery

logs:
	$(DC) logs -f
