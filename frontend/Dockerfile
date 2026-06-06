# Multi-stage: build da SPA com Vite, depois serve estáticos com nginx.
# Diretrizes COARF: build/release/run separados, imagem agnóstica de infra,
# container descartável com início rápido.

# ----- Stage 1: build -----
FROM node:20-alpine AS build
WORKDIR /app

# Instala dependências de forma reprodutível.
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Variáveis VITE_* são embutidas em BUILD TIME pelo Vite — recebidas como build args.
ARG VITE_API_URL
ARG VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID
ARG VITE_OIDC_REDIRECT_URI
ENV VITE_API_URL=$VITE_API_URL \
    VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY \
    VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID \
    VITE_OIDC_REDIRECT_URI=$VITE_OIDC_REDIRECT_URI

# Copia o código e compila os estáticos.
COPY . .
RUN npm run build

# ----- Stage 2: runtime -----
FROM nginx:1.27-alpine AS runtime

# Remove a config padrão e aplica a nossa (com headers de segurança).
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/goldendata.conf

# Copia os estáticos gerados.
COPY --from=build /app/dist /usr/share/nginx/html

# Os workers do nginx já rodam como usuário não-privilegiado (diretiva `user`
# na config base da imagem); o master apenas faz o bind da porta 8080 (não
# privilegiada). Hardening adicional fica a cargo do orquestrador (Kubernetes
# securityContext / read-only rootfs).
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
