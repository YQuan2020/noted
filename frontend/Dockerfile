FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# The bundle is large enough (mermaid + markdown/highlight) that Vite/Rollup can
# exceed Node's default heap in constrained containers — raise the ceiling.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
