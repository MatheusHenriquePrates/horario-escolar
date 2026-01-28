# Documentação da API

## Base URL

```
http://localhost:3001/api
```

## Autenticação

A API usa autenticação JWT (JSON Web Token). Após o login, inclua o token no header de todas as requisições protegidas:

```
Authorization: Bearer <seu_token_jwt>
```

---

## Endpoints

### Autenticação

#### POST /auth/login

Realiza login no sistema.

**Request:**
```json
{
  "email": "admin@escola.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": "uuid",
    "email": "admin@escola.com",
    "name": "Administrador",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Erros:**
- `400`: Email e senha são obrigatórios
- `401`: Credenciais inválidas
- `429`: Muitas tentativas (rate limit)

---

#### POST /auth/register

Registra novo usuário.

**Request:**
```json
{
  "email": "usuario@escola.com",
  "password": "senha123",
  "name": "Nome do Usuário",
  "role": "coordenador"
}
```

**Roles disponíveis:** `admin`, `coordenador`, `professor`

**Response (201):**
```json
{
  "message": "Usuário criado com sucesso",
  "user": { ... },
  "token": "..."
}
```

---

#### GET /auth/me

Retorna dados do usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@escola.com",
    "name": "Administrador",
    "role": "admin"
  }
}
```

---

#### PUT /auth/change-password

Altera senha do usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "currentPassword": "senha_atual",
  "newPassword": "nova_senha"
}
```

**Response (200):**
```json
{
  "message": "Senha alterada com sucesso"
}
```

---

### Professores

#### GET /teachers

Lista todos os professores com suas alocações.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Maria Silva",
    "workloadMonthly": 165,
    "color": "hsl(84, 70%, 80%)",
    "createdAt": "2026-01-28T15:16:41.591Z",
    "allocations": [
      {
        "id": "uuid",
        "subject": "Português",
        "lessonsPerWeek": 5,
        "classes": ["6A", "6B", "7A", "7B"]
      }
    ]
  }
]
```

---

#### POST /teachers

Cria novo professor.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "nome": "João Santos",
  "cargaHoraria": 165,
  "color": "#FF6B6B",
  "disciplinas": [
    {
      "nome": "Matemática",
      "aulasPorSemana": 5,
      "turmas": ["6A", "6B", "7A", "7B"]
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "João Santos",
  "workloadMonthly": 165,
  "color": "#FF6B6B",
  "allocations": [...]
}
```

---

#### PUT /teachers/:id

Atualiza professor existente.

**Headers:** `Authorization: Bearer <token>`

**Request:** Mesmo formato do POST

**Response (200):** Professor atualizado

---

#### DELETE /teachers/:id

Remove professor e suas aulas da grade.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Professor removido"
}
```

---

### Grade de Horários

#### POST /grade/gerar

Gera nova grade de horários automaticamente.

**Headers:** `Authorization: Bearer <token>`

**Request (opcional):**
```json
{
  "professores": ["uuid1", "uuid2"]
}
```

Se `professores` não for informado, usa todos os professores cadastrados.

**Response (200):**
```json
{
  "message": "Horário gerado com sucesso!",
  "scheduleId": "uuid",
  "warnings": []
}
```

**Response (400) - Erro de alocação:**
```json
{
  "message": "Erro ao gerar horário",
  "details": "Análise detalhada do problema...",
  "analysis": "..."
}
```

---

#### GET /grade

Retorna a grade atual em formato de matriz 3D.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "0": {
    "0": {
      "6A": {
        "teacherId": "uuid",
        "subject": "Português",
        "classId": "6A",
        "day": 0,
        "timeSlot": 0
      }
    }
  }
}
```

**Estrutura:** `grade[dia][horário][turma]`

- `dia`: 0-4 (Segunda a Sexta)
- `horário`: 0-6 (7 aulas por dia, exceto sexta que tem 6)

---

#### GET /grade/turma/:turma

Retorna grade filtrada por turma.

**Headers:** `Authorization: Bearer <token>`

**Exemplo:** `GET /grade/turma/6A`

---

#### GET /grade/professor/:id

Retorna grade filtrada por professor.

**Headers:** `Authorization: Bearer <token>`

**Exemplo:** `GET /grade/professor/uuid`

---

#### PUT /grade/aula

Atualiza ou cria uma aula manualmente.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "dia": 0,
  "horario": 0,
  "turma": "6A",
  "professorId": "uuid",
  "disciplina": "Português"
}
```

**Response (200):**
```json
{
  "sucesso": true,
  "conflitos": []
}
```

---

#### DELETE /grade/aula

Remove uma aula da grade.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "dia": 0,
  "horario": 0,
  "turma": "6A"
}
```

---

### Validação

#### GET /validation/validate

Valida a grade atual e retorna análise completa.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "valid": true,
  "conflicts": [],
  "warnings": [],
  "stats": {
    "totalLessons": 680,
    "teacherUtilization": [
      {
        "teacher": "Maria Silva",
        "allocated": 20,
        "expected": 34,
        "percentage": 58.8
      }
    ],
    "subjectCoverage": [...],
    "consecutiveViolations": 0
  },
  "report": "Relatório formatado em texto..."
}
```

---

### PDF

#### GET /pdf/gerar

Gera e baixa PDF com a grade completa.

**Headers:** `Authorization: Bearer <token>`

**Response:** Arquivo PDF (application/pdf)

O PDF inclui:
- Capa com informações gerais
- Legenda de professores com cores
- Grade de cada turma (20 turmas)

---

### Health Check

#### GET /health

Verifica se a API está funcionando.

**Response (200):**
```json
{
  "status": "ok",
  "time": "2026-01-28T15:18:47.323Z"
}
```

---

## Rate Limiting

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/auth/login` | 5 requisições | 15 minutos |
| `/grade/gerar` | 10 requisições | 1 hora |
| `/pdf/gerar` | 20 requisições | 1 hora |
| Geral | 100 requisições | 15 minutos |

**Response quando excede limite (429):**
```json
{
  "error": "Muitas requisições. Tente novamente em 15 minutos."
}
```

---

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |

---

## Exemplos com cURL

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@escola.com","password":"admin123"}'
```

### Listar Professores
```bash
curl http://localhost:3001/api/teachers \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Gerar Grade
```bash
curl -X POST http://localhost:3001/api/grade/gerar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Baixar PDF
```bash
curl -o grade.pdf http://localhost:3001/api/pdf/gerar \
  -H "Authorization: Bearer SEU_TOKEN"
```
