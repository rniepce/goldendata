# Imagem Keycloak que já embute o realm `tjmg` para importação automática.
# Útil em plataformas sem volumes persistentes simples (ex.: Railway).
# Para DEMO usa-se start-dev --import-realm; em PRODUÇÃO troque por `start`
# com banco dedicado (KC_DB/KC_DB_URL), KC_HOSTNAME e TLS no proxy.
FROM quay.io/keycloak/keycloak:26.0

COPY realm-tjmg.json /opt/keycloak/data/import/realm-tjmg.json

# Railway injeta a porta em $PORT; o Keycloak escuta nela.
ENV KC_HTTP_ENABLED=true \
    KC_HOSTNAME_STRICT=false \
    KC_HEALTH_ENABLED=true

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]
