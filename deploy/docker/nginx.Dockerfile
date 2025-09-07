FROM nginx:1.27-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
# Static files will be provided by a separate frontend container OR you can COPY them here if you prefer single-nginx.
