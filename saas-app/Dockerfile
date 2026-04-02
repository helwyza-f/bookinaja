# STAGE 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Pastikan ENV API mengarah ke domain asli agar browser bisa nembak
ENV NEXT_PUBLIC_API_URL=https://api.bookinaja.com/api/v1
RUN npm run build

# STAGE 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy hasil build standalone (fitur Next.js untuk hemat RAM)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./ 
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]