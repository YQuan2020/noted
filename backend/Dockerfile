FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Prisma engines require OpenSSL (the CLI, for libssl version detection).
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate

COPY --from=build /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 3000

# Apply migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
