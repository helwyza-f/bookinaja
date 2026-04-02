FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# File ini akan dikirim oleh GitHub Actions hasil dari build
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

EXPOSE 3000
CMD ["node", "server.js"]