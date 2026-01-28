#!/bin/bash

# Script para configurar PostgreSQL para o sistema de horários

echo "═══════════════════════════════════════════════════════"
echo "  🐘 CONFIGURAÇÃO DO POSTGRESQL"
echo "═══════════════════════════════════════════════════════"
echo ""

# Verificar se está rodando como usuário com permissão
if [ "$EUID" -eq 0 ]; then
    echo "❌ Não execute como root. Execute como seu usuário normal."
    exit 1
fi

# Criar role para o usuário atual
echo "📌 Criando role no PostgreSQL para o usuário: $USER"
sudo -u postgres createuser -s "$USER" 2>/dev/null || echo "   Role já existe ou erro (ok se já configurado)"

# Criar banco de dados
echo "📌 Criando banco de dados: horario_escolar"
createdb horario_escolar 2>/dev/null || echo "   Banco já existe"

# Testar conexão
echo ""
echo "📌 Testando conexão..."
if psql -d horario_escolar -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Conexão OK!"
else
    echo "❌ Erro na conexão. Verifique as permissões."
    exit 1
fi

# Atualizar .env
echo ""
echo "📌 Atualizando arquivo .env..."
cat > ../.env << EOF
# Configuração do PostgreSQL
DATABASE_URL="postgresql://$USER@localhost:5432/horario_escolar"

# JWT Secret (mude em produção!)
JWT_SECRET="horario-escolar-secret-key-2024-production"

# CORS Origins (adicione seu domínio em produção)
CORS_ORIGINS="http://localhost:8765,http://localhost:5173,http://localhost:3001"
EOF

echo "✅ Arquivo .env atualizado"

# Rodar migrations
echo ""
echo "📌 Aplicando schema no banco..."
cd ..
npx prisma db push --accept-data-loss

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ POSTGRESQL CONFIGURADO COM SUCESSO!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Banco: horario_escolar"
echo "  Usuário: $USER"
echo "  URL: postgresql://$USER@localhost:5432/horario_escolar"
echo ""
echo "  Para iniciar o servidor: npm run dev"
echo ""
