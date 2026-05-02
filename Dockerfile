FROM nginx:alpine

# Copy all site files (config.js is NOT included — generated at startup)
COPY . /usr/share/nginx/html

# Copy nginx config (listens on 8080 as required by Cloud Run)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy and permit the startup script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]