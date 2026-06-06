#!/bin/bash
# Aplica migrations e seed na primeira inicialização do Postgres (docker-entrypoint-initdb.d).
# ON_ERROR_STOP garante que qualquer erro de migration aborta o init.
set -euo pipefail

run_dir() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  for f in "$dir"/*.sql; do
    [ -e "$f" ] || continue
    echo ">> aplicando $f"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
  done
}

run_dir /migrations
run_dir /seed
echo ">> banco inicializado."
