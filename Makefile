# Atalhos de desenvolvimento.
.PHONY: up down logs test lint migrate seed psql

up:            ## Sobe toda a stack (db, keycloak, backend, frontend)
	docker compose up --build

down:          ## Derruba a stack e remove volumes
	docker compose down -v

logs:          ## Acompanha os logs
	docker compose logs -f

test:          ## Testes do back-end (lógica pura)
	cd backend && . .venv/bin/activate && python -m pytest

lint:          ## Lint do back-end
	cd backend && . .venv/bin/activate && ruff check app

psql:          ## Abre psql no banco do compose
	docker compose exec db psql -U goldendata -d goldendata
