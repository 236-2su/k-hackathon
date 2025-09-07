FROM node:20-alpine AS build
WORKDIR /fe
COPY frontend/ /fe
RUN npm ci && npm run build

FROM nginx:1.27-alpine
COPY --from=build /fe/dist/ /usr/share/nginx/html
COPY deploy/nginx/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
