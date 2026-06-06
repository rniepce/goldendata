# Build agnóstico de infraestrutura (12-factor). Imagem enxuta, usuário não-root.
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependências primeiro (cache de camadas).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY pyproject.toml .

# Usuário sem privilégios (hardening — CESEC §5.1).
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000

# Stateless; escuta na porta definida pelo ambiente (port binding — 12-factor VII).
# Usa $PORT quando presente (Railway/PaaS); cai para 8000 (docker-compose) caso contrário.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
