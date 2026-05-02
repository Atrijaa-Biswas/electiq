#!/bin/sh

# Inject environment variables into frontend
cat <<EOF > /usr/share/nginx/html/env.js
window.ENV = {
  GROQ_API_KEY: "$GROQ_API_KEY"
};
EOF

# Start nginx
nginx -g "daemon off;"