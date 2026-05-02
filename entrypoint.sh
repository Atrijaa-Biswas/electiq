#!/bin/sh

# Replace PORT in nginx config (IMPORTANT)
envsubst '$PORT' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

# Inject env.js
cat <<EOF > /usr/share/nginx/html/env.js
window.ENV = {
  GROQ_API_KEY: "$GROQ_API_KEY"
};
EOF

# DEBUG (optional but useful)
echo "PORT is: $PORT"
cat /etc/nginx/conf.d/default.conf

# Start nginx
nginx -g "daemon off;"