# Arquitetura do Sistema

## Visão Geral

O sistema segue uma arquitetura cliente-servidor com separação clara entre frontend e backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    React    │  │   Zustand   │  │  Tailwind   │              │
│  │  Components │  │   Stores    │  │     CSS     │              │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘              │
│         │                │                                       │
│         └────────┬───────┘                                       │
│                  │                                               │
│         ┌────────▼────────┐                                      │
│         │   API Service   │                                      │
│         │  (fetch + JWT)  │                                      │
│         └────────┬────────┘                                      │
└──────────────────┼──────────────────────────────────────────────┘
                   │ HTTP/REST
                   │
┌──────────────────┼──────────────────────────────────────────────┐
│                  │           BACKEND                             │
│         ┌────────▼────────┐                                      │
│         │     Express     │                                      │
│         │     Router      │                                      │
│         └────────┬────────┘                                      │
│                  │                                               │
│    ┌─────────────┼─────────────┐                                 │
│    │             │             │                                 │
│    ▼             ▼             ▼                                 │
│ ┌──────┐    ┌──────┐    ┌──────────┐                            │
│ │ Auth │    │ Rate │    │  Helmet  │                            │
│ │ JWT  │    │Limit │    │ Security │                            │
│ └──┬───┘    └──┬───┘    └────┬─────┘                            │
│    │           │             │                                   │
│    └───────────┴─────────────┘                                   │
│                  │                                               │
│         ┌────────▼────────┐                                      │
│         │   Controllers   │                                      │
│         └────────┬────────┘                                      │
│                  │                                               │
│    ┌─────────────┼─────────────┐                                 │
│    │             │             │                                 │
│    ▼             ▼             ▼                                 │
│ ┌──────┐    ┌──────┐    ┌──────────┐                            │
│ │Prisma│    │Schedu│    │   PDF    │                            │
│ │ ORM  │    │ler   │    │Generator │                            │
│ └──┬───┘    └──────┘    └──────────┘                            │
│    │                                                             │
└────┼────────────────────────────────────────────────────────────┘
     │
┌────▼────┐
│PostgreSQL│
│ Database │
└──────────┘
```

---

## Backend

### Estrutura de Diretórios

```
backend/
├── prisma/
│   ├── schema.prisma          # Definição dos modelos
│   └── migrations/            # Histórico de migrações
├── src/
│   ├── controllers/           # Lógica de negócio
│   │   ├── authController.ts
│   │   ├── teacherController.ts
│   │   ├── scheduleController.ts
│   │   └── pdfController.ts
│   ├── middleware/
│   │   ├── auth.ts            # Verificação JWT
│   │   └── security.ts        # Rate limiting + Helmet
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── teacherRoutes.ts
│   │   ├── scheduleRoutes.ts
│   │   ├── pdfRoutes.ts
│   │   └── validationRoutes.ts
│   ├── services/
│   │   ├── scheduler.ts       # Algoritmo de geração
│   │   └── pdfGenerator.ts    # Geração de PDF
│   ├── schemas/
│   │   └── index.ts           # Validação Zod
│   ├── utils/
│   │   ├── prismaClient.ts    # Singleton Prisma
│   │   └── gradeValidator.ts  # Validação de grade
│   └── server.ts              # Entry point
└── .env                       # Variáveis de ambiente
```

### Modelos de Dados (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // Hash bcrypt
  name      String
  role      String   @default("coordenador")
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Teacher {
  id              String       @id @default(uuid())
  name            String
  workloadMonthly Int
  color           String
  allocations     Allocation[]
  createdAt       DateTime     @default(now())
}

model Allocation {
  id             String            @id @default(uuid())
  teacherId      String
  teacher        Teacher           @relation(...)
  subject        String
  lessonsPerWeek Int
  classes        ClassAllocation[]
}

model ClassAllocation {
  id           String     @id @default(uuid())
  allocationId String
  allocation   Allocation @relation(...)
  classId      String     // e.g. "6A"
}

model Schedule {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  active    Boolean  @default(true)
  lessons   Lesson[]
}

model Lesson {
  id         String   @id @default(uuid())
  scheduleId String
  schedule   Schedule @relation(...)
  teacherId  String
  subject    String
  classId    String
  day        Int      // 0-4 (Segunda a Sexta)
  timeSlot   Int      // 0-6 (horários)
  locked     Boolean  @default(false)
}
```

### Fluxo de Autenticação

```
┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐
│ Client │      │ Server │      │  Auth  │      │Database│
└───┬────┘      └───┬────┘      └───┬────┘      └───┬────┘
    │               │               │               │
    │ POST /login   │               │               │
    │──────────────>│               │               │
    │               │ validate      │               │
    │               │──────────────>│               │
    │               │               │ find user     │
    │               │               │──────────────>│
    │               │               │<──────────────│
    │               │               │               │
    │               │ compare hash  │               │
    │               │<──────────────│               │
    │               │               │               │
    │               │ generate JWT  │               │
    │               │──────────────>│               │
    │               │<──────────────│               │
    │               │               │               │
    │ { token }     │               │               │
    │<──────────────│               │               │
    │               │               │               │
    │ GET /teachers │               │               │
    │ + Bearer token│               │               │
    │──────────────>│               │               │
    │               │ verify JWT    │               │
    │               │──────────────>│               │
    │               │<──────────────│               │
    │               │               │ query         │
    │               │               │──────────────>│
    │               │               │<──────────────│
    │ { data }      │               │               │
    │<──────────────│               │               │
```

### Algoritmo de Geração de Horários

O algoritmo usa uma abordagem de tentativa e erro com múltiplas iterações:

```
1. CARREGAR dados dos professores e alocações
2. VALIDAR carga horária (max 34 aulas/semana por professor/turma)
3. CRIAR lista de todas as aulas necessárias
4. EMBARALHAR a lista para randomização
5. PARA cada tentativa (max 100):
   a. CRIAR grade vazia 5x7x20 (dias x horários x turmas)
   b. EMBARALHAR slots disponíveis
   c. PARA cada aula:
      - TENTAR alocar verificando:
        * Turma livre no horário
        * Professor livre no horário
        * Máximo 2 aulas consecutivas da mesma matéria
   d. CALCULAR taxa de sucesso
   e. SE 100%: PARAR
   f. SE melhor que anterior: SALVAR
6. SE taxa >= 80%: SALVAR no banco
7. SENÃO: RETORNAR análise de problemas
```

**Restrições implementadas:**
- Um professor não pode estar em duas turmas ao mesmo tempo
- Uma turma não pode ter dois professores ao mesmo tempo
- Máximo 2 aulas consecutivas da mesma disciplina
- Sexta-feira tem apenas 6 aulas (sem 7ª aula)

---

## Frontend

### Estrutura de Diretórios

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── Layout.tsx         # Layout principal
│   │   ├── registration/
│   │   │   ├── RegistrationContainer.tsx
│   │   │   ├── TeacherList.tsx
│   │   │   ├── EditTeacherModal.tsx
│   │   │   └── ClassesFilter.tsx
│   │   ├── schedule/
│   │   │   ├── ScheduleContainer.tsx
│   │   │   ├── ScheduleGrid.tsx
│   │   │   └── EditModal.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Input.tsx
│   ├── hooks/
│   │   ├── useAuthStore.ts        # Estado de autenticação
│   │   ├── useScheduleStore.ts    # Estado da grade
│   │   └── useNotificationStore.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── SchedulePage.tsx
│   ├── services/
│   │   └── api.ts                 # Chamadas HTTP
│   ├── contexts/
│   │   └── ThemeContext.tsx       # Modo escuro
│   ├── utils/
│   │   ├── autoDistributor.ts     # Distribuição automática
│   │   └── pdfGenerator.ts        # Geração local de PDF
│   ├── App.tsx
│   └── main.tsx
└── index.html
```

### Gerenciamento de Estado (Zustand)

```typescript
// useAuthStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

// useScheduleStore.ts
interface ScheduleState {
  teachers: Teacher[];
  schedule: ScheduleGrid;

  loadTeachers: () => Promise<void>;
  addTeacher: (teacher: Teacher) => Promise<void>;
  removeTeacher: (id: string) => Promise<void>;
  generateSchedule: () => Promise<void>;
}
```

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│                        App.tsx                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 useAuthStore                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │   │
│  │  │  user   │  │  token  │  │  login/logout   │  │   │
│  │  └────┬────┘  └────┬────┘  └────────┬────────┘  │   │
│  └───────┼────────────┼────────────────┼───────────┘   │
│          │            │                │               │
│          ▼            ▼                ▼               │
│  ┌───────────────────────────────────────────────┐     │
│  │               Renderização                     │     │
│  │  user ? <MainApp /> : <LoginPage />           │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Comunicação com API

```typescript
// api.ts - Fetch autenticado
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // Redireciona para login se 401
  if (response.status === 401) {
    localStorage.removeItem('auth-storage');
    window.location.reload();
  }

  return response;
};
```

---

## Segurança

### Camadas de Proteção

1. **Autenticação JWT**
   - Token expira em 7 dias
   - Assinatura com secret configurável
   - Payload: `{ userId, email, role }`

2. **Hash de Senhas**
   - Algoritmo: bcrypt
   - Salt rounds: 10
   - Comparação segura contra timing attacks

3. **Rate Limiting**
   - Proteção por IP
   - Limites diferentes por criticidade de endpoint

4. **Helmet**
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

5. **Validação de Entrada**
   - Zod para validação de schemas
   - Sanitização de strings
   - Verificação de tipos

### Configuração de CORS

```typescript
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:5174'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

---

## Escalabilidade

### Pontos de Melhoria para Produção

1. **Banco de Dados**
   - Connection pooling com PgBouncer
   - Read replicas para consultas
   - Índices otimizados (já implementados)

2. **Cache**
   - Redis para sessões
   - Cache de grades geradas

3. **Processamento**
   - Fila para geração de grades (Bull/Redis)
   - Worker separado para PDFs pesados

4. **Infraestrutura**
   - Load balancer (nginx)
   - Múltiplas instâncias do backend
   - CDN para assets estáticos

---

## Testes

### Estrutura Recomendada

```
backend/
├── tests/
│   ├── unit/
│   │   ├── scheduler.test.ts
│   │   └── validator.test.ts
│   ├── integration/
│   │   ├── auth.test.ts
│   │   └── teachers.test.ts
│   └── e2e/
│       └── flow.test.ts

frontend/
├── tests/
│   ├── components/
│   │   └── TeacherList.test.tsx
│   └── hooks/
│       └── useAuthStore.test.ts
```

### Ferramentas Sugeridas

- **Backend**: Jest + Supertest
- **Frontend**: Vitest + React Testing Library
- **E2E**: Playwright ou Cypress
