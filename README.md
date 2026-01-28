# Horário Escolar Inteligente

Sistema completo para gestão e geração automática de horários escolares para Ensino Fundamental II (6º ao 9º ano) em regime de tempo integral.

## Funcionalidades

- **Cadastro de Professores**: Gerenciamento completo de professores com carga horária e disciplinas
- **Distribuição de Aulas**: Alocação automática de turmas e aulas por semana
- **Geração Automática de Grade**: Algoritmo inteligente que distribui as aulas respeitando restrições
- **Validação de Conflitos**: Detecta automaticamente conflitos de horários
- **Exportação em PDF**: Gera relatórios completos por turma
- **Modo Escuro**: Interface adaptável para diferentes preferências
- **Autenticação JWT**: Sistema seguro de login com controle de acesso

## Tecnologias

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (autenticação)
- Bcrypt (hash de senhas)
- Zod (validação)
- Helmet (segurança)
- Rate Limiting

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Zustand (estado)
- Lucide Icons
- Vite

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/MatheusHenriquePrates/horario-escolar.git
cd horario-escolar
```

### 2. Configure o Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` baseado no exemplo:

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/horario_escolar"
JWT_SECRET="sua-chave-secreta-forte-aqui"
PORT=3001
CORS_ORIGINS="http://localhost:5174"
NODE_ENV="development"
```

### 3. Configure o Banco de Dados

```bash
# Criar o banco no PostgreSQL
psql -U postgres -c "CREATE DATABASE horario_escolar;"

# Aplicar as migrações
npx prisma migrate deploy

# (Opcional) Visualizar o banco
npx prisma studio
```

### 4. Configure o Frontend

```bash
cd ../frontend
npm install
```

### 5. Inicie o Sistema

Em terminais separados:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Acesse: http://localhost:5174

## Primeiro Acesso

Na primeira execução, o sistema cria automaticamente um usuário administrador:

- **Email**: admin@escola.com
- **Senha**: admin123

**Importante**: Altere a senha após o primeiro login!

## Estrutura do Projeto

```
horario-escolar/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Modelos do banco
│   ├── src/
│   │   ├── controllers/       # Lógica de negócio
│   │   ├── middleware/        # Auth, segurança
│   │   ├── routes/            # Definição de rotas
│   │   ├── services/          # Serviços (scheduler, PDF)
│   │   ├── schemas/           # Validação Zod
│   │   └── server.ts          # Entry point
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── hooks/             # Stores Zustand
│   │   ├── pages/             # Páginas
│   │   ├── services/          # Chamadas API
│   │   └── utils/             # Utilitários
│   └── index.html
└── docs/
    └── API.md                 # Documentação da API
```

## Scripts Disponíveis

### Backend

```bash
npm run dev      # Desenvolvimento com hot-reload
npm run build    # Compilar TypeScript
npm start        # Produção
```

### Frontend

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
```

## Configuração de Horários

O sistema está configurado para tempo integral:

| Horário | Segunda-Quinta | Sexta |
|---------|----------------|-------|
| 1ª Aula | 07:30-08:20 | 07:30-08:20 |
| 2ª Aula | 08:20-09:10 | 08:20-09:10 |
| Recreio | 09:10-09:30 | 09:10-09:30 |
| 3ª Aula | 09:30-10:20 | 09:30-10:20 |
| 4ª Aula | 10:20-11:10 | 10:20-11:10 |
| 5ª Aula | 11:10-12:00 | 11:10-12:00 |
| Almoço | 12:00-13:30 | 12:00-13:30 |
| 6ª Aula | 13:30-14:20 | 13:30-14:20 |
| 7ª Aula | 14:20-15:10 | - |

**Total**: 34 aulas/semana (7+7+7+7+6)

## Turmas Suportadas

- 6º Ano: 6A, 6B, 6C, 6D, 6E
- 7º Ano: 7A, 7B, 7C, 7D, 7E
- 8º Ano: 8A, 8B, 8C, 8D, 8E
- 9º Ano: 9A, 9B, 9C, 9D, 9E

## Segurança

- Autenticação via JWT com expiração de 7 dias
- Senhas hasheadas com bcrypt (salt rounds: 10)
- Rate limiting por IP:
  - Login: 5 tentativas / 15 minutos
  - Geral: 100 requisições / 15 minutos
  - Geração de grade: 10 / hora
  - Exportação PDF: 20 / hora
- Headers de segurança via Helmet
- Validação de entrada com Zod

## Licença

MIT

## Autor

Desenvolvido por Matheus Henrique Prates

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
