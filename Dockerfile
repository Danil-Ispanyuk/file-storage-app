# Multi-stage build для Next.js додатку

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Встановити залежності для Prisma
RUN apk add --no-cache libc6-compat openssl

# Копіювати файли залежностей
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Встановити залежності
RUN npm ci

# Генерувати Prisma Client
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Копіювати залежності з попереднього stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

# Копіювати вихідний код
COPY . .

# Встановити змінні оточення для build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build додаток
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Створити non-root користувача
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копіювати необхідні файли
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Копіювати Prisma файли
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Встановити права доступу
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

