# Statische site achter nginx — geen buildstap nodig.
FROM nginx:1.27-alpine

# Eigen serverconfiguratie (gzip, caching, security headers)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# De site zelf
COPY site/ /usr/share/nginx/html/

# Healthcheck zodat een orchestrator (of docker compose) weet of de site draait
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80
