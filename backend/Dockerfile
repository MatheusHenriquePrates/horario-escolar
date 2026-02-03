FROM node:20-alpine

# Instala OpenSSL para Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia código fonte
COPY . .

# Gera cliente Prisma
RUN npx prisma generate

EXPOSE 3001

# Executa migrations e inicia servidor
CMD ["sh", "-c", "npx prisma migrate deploy && npx ts-node src/server.ts"]
