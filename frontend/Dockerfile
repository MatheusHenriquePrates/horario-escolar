FROM node:20-alpine AS builder

WORKDIR /app

# Argumento para URL da API
ARG VITE_API_URL=http://localhost:3001

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia código fonte
COPY . .

# Define variável de ambiente para o build
ENV VITE_API_URL=${VITE_API_URL}

# Build de produção
RUN npm run build

# ==========================================
# Imagem de produção com Nginx
# ==========================================
FROM nginx:alpine

# Copia build para o nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração do nginx para SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
