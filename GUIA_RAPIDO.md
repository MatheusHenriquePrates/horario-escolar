# 🚀 GUIA RÁPIDO - Sistema de Horários

## 📦 Instalação e Setup

### 1. Instalar Dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Configurar Banco de Dados

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 3. Iniciar Sistema

**Opção A: Dois Terminais**
```bash
# Terminal 1 - Backend (porta 3001)
cd backend
npm run dev

# Terminal 2 - Frontend (porta 5173)
cd frontend
npm run dev
```

**Opção B: Script Único** (se disponível)
```bash
npm run dev
```

### 4. Acessar Interface
```
http://localhost:5173
```

---

## 👨‍🏫 Como Cadastrar Professores

### Passo 1: Acessar Aba "Cadastro"

### Passo 2: Preencher Dados
- **Nome:** Nome do professor
- **Carga Horária:** Horas mensais (ex: 165h)
- **Disciplinas:** Selecionar uma ou mais disciplinas

### Passo 3: Entender a Distribuição Automática

O sistema calcula automaticamente:
```
Capacidade Semanal = (Carga Mensal ÷ 4) × 60 ÷ 50
Limite Máximo = 34 aulas/semana
```

**Exemplo:**
```
165h/mês → 165 ÷ 4 = 41,25h/semana
         → 41,25 × 60 = 2.475 min/semana
         → 2.475 ÷ 50 = 49,5 aulas
         → Limite: 34 aulas (máximo permitido)
```

### Passo 4: Conferir Alocação

Após cadastrar, o sistema mostra:
```
✅ Professor cadastrado!

Ana Silva - 165h/mês
  ✓ Português: 6A, 7B, 8C, 9A (4 turmas)
  ✓ Matemática: 6D, 7E, 8A, 9B (4 turmas)

Total: 40 aulas (8 turmas × 5 aulas)
```

---

## 📊 Visualizar Grade Horária

### Aba "Grade Horária"

**Opções de Visualização:**

1. **Por Turma** 🏫
   - Selecione uma turma (ex: 6A)
   - Veja o horário completo daquela turma
   - Segunda a Sexta, todas as aulas

2. **Por Professor** 👨‍🏫
   - Selecione um professor
   - Veja onde ele está alocado
   - Detecta conflitos automaticamente

3. **Todas as Turmas** 📋
   - Mini-cards com visão geral
   - Todas as 18 turmas
   - Cores por série

4. **Grade Completa** 📅
   - Tabela estilo Excel
   - Todas as turmas lado a lado
   - Exportável para PDF

---

## 🎨 Cores e Legendas

### Intervalos
- 🟡 **Recreio** (09:10 - 09:30)
- 🟢 **Almoço** (12:00 - 13:30)
- 🔵 **Lanche** (15:10 - 15:20)

### Dias da Semana
- **Segunda a Quinta:** 7 aulas
- **Sexta:** 6 aulas (termina às 14:20)

### Séries
- 🔴 6º Ano (A-E)
- 🟠 7º Ano (A-E)
- 🟡 8º Ano (A-D)
- 🟢 9º Ano (A-D)

---

## 🔄 Gerar Grade Automaticamente

### Passo 1: Cadastrar TODOS os Professores

Cadastre todos os professores com suas disciplinas.

### Passo 2: Clicar em "Gerar Grade"

O sistema tentará encaixar todas as aulas respeitando:
- ✅ Sem conflitos (professor em 2 lugares)
- ✅ Sem conflitos (turma com 2 professores)
- ✅ Máximo 2 aulas consecutivas da mesma disciplina
- ✅ Sexta-feira termina mais cedo

### Passo 3: Verificar Resultado

**Sucesso (≥80%):**
```
✅ Grade gerada com sucesso!
   1.200 de 1.224 aulas alocadas (98%)
```

**Falha (<80%):**
```
❌ Não foi possível gerar grade completa

Professores com problemas:
  - João Silva: 15 aulas não alocadas
  - Maria Costa: 8 aulas não alocadas

Sugestão: Reduza a carga horária ou adicione mais professores
```

---

## 📄 Exportar para PDF

### Opção 1: PDF Completo
```
Botão: "Exportar PDF Completo"

Conteúdo:
  - Capa com informações gerais
  - 1 página por dia da semana
  - Tabela com todas as 18 turmas
  - Cores diferenciadas por série
```

### Opção 2: PDF por Turma (futuro)
```
Selecionar turma → "Exportar PDF desta Turma"
```

---

## 🐛 Problemas Comuns

### Problema 1: Todas as Turmas no 6º Ano
**Solução:** Sistema corrigido! Agora usa round-robin entre séries.

### Problema 2: Grade Não Gera
**Causas possíveis:**
- Poucos professores cadastrados
- Carga horária insuficiente
- Disciplinas sem professor

**Solução:**
1. Verifique se todas as 14 disciplinas têm professor
2. Calcule carga total necessária:
   - 18 turmas × 32 aulas = 576 aulas/semana
   - Mínimo: 18 professores com 165h/mês

### Problema 3: Conflitos Detectados
**Causas:**
- Algoritmo não conseguiu encaixar todas as aulas
- Tentativas limitadas (100 tentativas)

**Solução:**
- Clique em "Gerar Grade" novamente (aleatoriedade pode ajudar)
- Ajuste cargas horárias
- Adicione mais professores

---

## 📱 Atalhos e Dicas

### Atalhos de Teclado
- `Ctrl + S`: Salvar alterações (em edição)
- `Esc`: Fechar modais
- `Tab`: Navegar entre campos

### Dicas
1. **Cadastre primeiro professores de disciplinas com mais aulas:**
   - Português (5 aulas)
   - Matemática (5 aulas)
   - História, Geografia, Ciências (3 aulas cada)

2. **Use professores "coringa":**
   - Professores com múltiplas disciplinas
   - Ajuda a preencher lacunas

3. **Monitore a distribuição:**
   - Console do navegador (F12) mostra logs detalhados
   - API `/stats/distribution` mostra estatísticas

---

## 🔧 Manutenção

### Resetar Banco de Dados
```bash
cd backend
npx prisma db push --force-reset
```
⚠️ **ATENÇÃO:** Isso apaga TODOS os dados!

### Ver Banco de Dados
```bash
cd backend
npx prisma studio
```

### Limpar Cache do Frontend
```bash
cd frontend
rm -rf node_modules/.vite
npm run dev
```

---

## 📞 Suporte

### Logs Importantes

**Backend (Terminal 1):**
```
📊 Professor: Maria Silva
   Capacidade: 34 aulas/semana
   Português: 18 turmas disponíveis
   → Alocadas 4 turmas: 6º(1) 7º(1) 8º(1) 9º(1)
```

**Frontend (Console F12):**
```
Auto-distribuição concluída:
  - 30 aulas alocadas
  - 88% de ocupação
```

### Checklist de Diagnóstico
- [ ] Backend rodando na porta 3001?
- [ ] Frontend rodando na porta 5173?
- [ ] Banco de dados criado? (`prisma db push`)
- [ ] Console mostra erros? (F12)

---

## 🎯 Próximos Passos Recomendados

1. Cadastrar todos os professores
2. Gerar grade automática
3. Revisar conflitos (se houver)
4. Exportar PDF
5. Fazer ajustes finos manualmente (futuro)

---

*Sistema atualizado em 27/01/2026*
*Versão 2.0 - Distribuição Round-Robin*
