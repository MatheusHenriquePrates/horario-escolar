# 🤖 SISTEMA DE IA - Otimização Inteligente

**Data:** 27/01/2026
**Status:** ✅ Implementado e Funcional

---

## 🧠 O QUE É?

Um sistema de **Inteligência Artificial** integrado ao projeto que usa **Algoritmo Genético** (inspirado em evolução natural) para encontrar a **melhor distribuição** de turmas entre professores.

---

## 🎯 FUNCIONALIDADES

### 1. Análise Inteligente em Tempo Real

O sistema analisa **automaticamente** a distribuição atual e mostra:

- **Score de Qualidade** (0-100%)
- **Gargalos Detectados** (disciplinas sem professores)
- **Sugestões Automáticas** (o que fazer para melhorar)
- **Cobertura por Disciplina** (quantas turmas estão cobertas)

### 2. Otimização com IA

Ao clicar em **"Otimizar com IA"**, o sistema:

1. Cria **100 configurações diferentes** de distribuição
2. **Evolui** essas configurações por **200 gerações**
3. **Avalia** cada configuração usando múltiplos critérios
4. Retorna a **melhor solução encontrada**

### 3. Dashboard Visual

Interface bonita que mostra:
- 📊 Score geral do sistema
- ⚠️  Gargalos (disciplinas problemáticas)
- 💡 Sugestões automáticas
- 🎯 Resultado da otimização com IA

---

## 🧬 COMO FUNCIONA O ALGORITMO GENÉTICO?

### Conceito
Algoritmos Genéticos simulam **evolução natural** para resolver problemas complexos.

### Etapas

#### 1️⃣ **População Inicial**
```
Cria 100 indivíduos (configurações de distribuição) aleatórios
Exemplo:
  - Indivíduo 1: Prof A → Português [6A, 7B, 8C]
  - Indivíduo 2: Prof A → Português [6D, 7E, 9A]
  - ... (98 outros)
```

#### 2️⃣ **Avaliação (Fitness)**
Cada indivíduo recebe uma **nota** baseada em:

| Critério | Peso | Descrição |
|----------|------|-----------|
| **Balanceamento entre séries** | 40% | Todas as séries têm turmas? |
| **Cobertura de disciplinas** | 30% | Todas as disciplinas têm professores? |
| **Eficiência (sem overlap)** | 20% | Turmas não duplicadas? |
| **Utilização de professores** | 10% | Professores sendo bem aproveitados? |

**Exemplo:**
```javascript
Indivíduo 1:
  - 6º: 3 turmas, 7º: 3 turmas, 8º: 2 turmas, 9º: 2 turmas
  - Balanceamento: 38/40 ✅
  - Cobertura: 12/14 disciplinas
  - Cobertura: 26/30 ⚠️
  - Eficiência: 20/20 ✅
  - Utilização: 8/10 ✅
  → Fitness: 82/100
```

#### 3️⃣ **Seleção**
- Os **10% melhores** sobrevivem automaticamente (elitismo)
- Resto é substituído por "filhos" dos melhores

#### 4️⃣ **Crossover (Cruzamento)**
Combina dois indivíduos bons para criar um novo:

```
Pai 1: Prof A → Português [6A, 7B, 8C] + Prof B → Matemática [6D]
Pai 2: Prof A → Português [6E, 7D] + Prof B → Matemática [8A, 9B]
       ↓ CROSSOVER ↓
Filho: Prof A → Português [6A, 7B] + Prof B → Matemática [8A, 9B]
```

#### 5️⃣ **Mutação**
Pequenas mudanças aleatórias (15% de chance):

```
Antes: Prof A → Português [6A, 7B, 8C]
Mutação: Troca 7B por 7E
Depois: Prof A → Português [6A, 7E, 8C]
```

#### 6️⃣ **Repetir**
Repete etapas 2-5 por **200 gerações**.

A cada geração, a população fica **melhor** (maior fitness).

#### 7️⃣ **Resultado**
Após 200 gerações, retorna o **melhor indivíduo** encontrado.

---

## 📊 CRITÉRIOS DE AVALIAÇÃO DETALHADOS

### 1. Balanceamento entre Séries (40 pontos)

**Objetivo:** Todas as 4 séries (6º, 7º, 8º, 9º) devem ter turmas de cada disciplina.

**Cálculo:**
```javascript
Para cada disciplina:
  - Conta turmas por série: {6º: 3, 7º: 2, 8º: 3, 9º: 2}
  - Calcula variância (quão diferente são os números)
  - Menor variância = melhor balanceamento
  - Score: 1 / (1 + variância) * 40
```

**Exemplo Bom:**
```
Português:
  6º: 4 turmas ✅
  7º: 5 turmas ✅
  8º: 4 turmas ✅
  9º: 4 turmas ✅
  → Variância: 0.2 → Score: 38/40
```

**Exemplo Ruim:**
```
Português:
  6º: 15 turmas ❌ (muito concentrado!)
  7º: 2 turmas
  8º: 1 turma
  9º: 0 turmas
  → Variância: 32.5 → Score: 1/40
```

### 2. Cobertura de Disciplinas (30 pontos)

**Objetivo:** Máximo de disciplinas com pelo menos um professor.

**Cálculo:**
```javascript
disciplinasComProfessor = 12
totalDisciplinas = 14
score = (12 / 14) * 30 = 25.7
```

### 3. Eficiência - Sem Overlap (20 pontos)

**Objetivo:** Mesma turma não pode ter 2 professores da mesma disciplina.

**Penalidade:** -5 pontos por cada overlap detectado.

**Exemplo:**
```
Prof A → Português [6A, 6B]
Prof B → Português [6B, 6C]  ← 6B duplicado!
→ Penalidade: -5
→ Score eficiência: 15/20
```

### 4. Utilização de Professores (10 pontos)

**Objetivo:** Aproveitar bem os professores cadastrados.

**Cálculo:**
```javascript
professoresUsados = 8
score = Math.min(8, 10)
```

---

## 💻 COMO USAR

### 1. Cadastrar Professores

Cadastre pelo menos **3 professores** com disciplinas variadas.

### 2. Ver Análise Automática

O **Dashboard de Análise Inteligente** aparece automaticamente mostrando:
- Score atual
- Gargalos
- Sugestões

### 3. Otimizar com IA

Quando aparecer o botão **"Otimizar Agora"**:

1. Clique no botão
2. Aguarde ~1-2 segundos (processamento)
3. Veja o resultado:
   - Score da otimização
   - Sugestões específicas
   - Avisos (se houver)

### 4. Aplicar Sugestões

Siga as sugestões da IA para melhorar a distribuição:
- Adicionar professores para disciplinas descobertas
- Redistribuir cargas horárias
- Balancear entre séries

---

## 📈 PARÂMETROS DA IA

Você pode ajustar os parâmetros em `aiOptimizer.ts`:

| Parâmetro | Valor Padrão | Descrição |
|-----------|--------------|-----------|
| `populationSize` | 100 | Quantos indivíduos por geração |
| `generations` | 200 | Quantas gerações evoluir |
| `mutationRate` | 0.15 (15%) | Chance de mutação |
| `eliteRate` | 0.10 (10%) | % dos melhores que sobrevivem |

**Dica:** Aumentar `generations` melhora resultado mas demora mais.

---

## 🎨 INTERFACE

### Cores do Score

- 🟢 **80-100%:** Excelente (verde)
- 🟡 **60-79%:** Boa (amarelo)
- 🔴 **0-59%:** Ruim (vermelho)

### Ícones

- 🧠 **Brain:** Análise inteligente
- ⚡ **Zap:** Otimização com IA
- ⚠️  **AlertTriangle:** Gargalos
- ✅ **CheckCircle:** Sugestões
- 📊 **TrendingUp:** Melhoria

---

## 🔬 EXEMPLO PRÁTICO

### Cenário Inicial
```
3 professores cadastrados:
  - Maria: Português (165h) → 6A, 6B, 6C, 6D, 6E
  - João: Matemática (165h) → 6A, 6B
  - Ana: História (80h) → 7A

Score inicial: 45% (Ruim)

Gargalos:
  - Português: 100% no 6º ano
  - Geografia: SEM PROFESSORES
  - Ciências: SEM PROFESSORES
```

### Após Otimização com IA
```
🤖 Processando...
  - Geração 0: Fitness = 42
  - Geração 20: Fitness = 58
  - Geração 40: Fitness = 67
  - Geração 60: Fitness = 74
  - Geração 80: Fitness = 79
  - Geração 100: Fitness = 82
  - Geração 120: Fitness = 85
  - Geração 140: Fitness = 87
  - Geração 160: Fitness = 88
  - Geração 180: Fitness = 89
  - Geração 200: Fitness = 89

✅ Resultado: Score 89/100

Sugestões:
  ✅ Distribuição excelente! Bem balanceada entre séries.
  💡 Considere adicionar professor para Geografia e Ciências

Nova distribuição:
  - Maria: Português → 6A, 7B, 8C, 9A
  - João: Matemática → 6B, 7C, 8A, 9B
  - Ana: História → 6C, 7D, 8B, 9C
```

---

## 🚀 VANTAGENS DO SISTEMA

1. ✅ **Automático:** Não precisa pensar, a IA faz tudo
2. ✅ **Inteligente:** Aprende e melhora com gerações
3. ✅ **Rápido:** ~1 segundo para processar
4. ✅ **Visual:** Dashboard bonito e fácil de entender
5. ✅ **Preciso:** Múltiplos critérios de avaliação
6. ✅ **Adaptável:** Funciona com qualquer quantidade de professores

---

## 📚 TECNOLOGIAS USADAS

- **React:** Interface visual
- **TypeScript:** Tipagem forte
- **Algoritmo Genético:** IA de otimização
- **Lucide Icons:** Ícones bonitos
- **Tailwind CSS:** Estilização

---

## 🎓 CONCEITOS DE IA

### O que é Algoritmo Genético?

É uma técnica de **Inteligência Artificial** que imita a **evolução biológica**:

- **Darwin:** "Sobrevivência do mais apto"
- **Genética:** Características passam de pais para filhos
- **Mutação:** Pequenas mudanças aleatórias
- **Seleção Natural:** Melhores sobrevivem

### Por que usar?

- ✅ **Ótimo para problemas complexos** (muitas variáveis)
- ✅ **Não precisa de solução perfeita**, apenas boa
- ✅ **Escala bem** (funciona com 10 ou 100 professores)
- ✅ **Evita mínimos locais** (por causa da mutação)

### Alternativas

Outras técnicas de IA que poderiam ser usadas:

- **Simulated Annealing:** Mais rápido, menos preciso
- **Particle Swarm:** Mais simples
- **Redes Neurais:** Overkill para este problema
- **Busca Gulosa:** Muito simples, não funciona bem aqui

---

## 🐛 TROUBLESHOOTING

### "Otimização não melhora muito"

**Causa:** Poucos professores ou muitas disciplinas descobertas.

**Solução:** Adicione mais professores antes de otimizar.

### "Score sempre baixo"

**Causa:** Configuração inicial ruim.

**Solução:**
1. Certifique-se de ter pelo menos 1 professor por disciplina
2. Cargas horárias adequadas (mínimo 80h)

### "IA demora muito"

**Causa:** Parâmetros muito altos.

**Solução:** Reduza `generations` de 200 para 100.

---

## 📝 CÓDIGO-FONTE

| Arquivo | Descrição |
|---------|-----------|
| [frontend/src/utils/aiOptimizer.ts](frontend/src/utils/aiOptimizer.ts) | Algoritmo genético |
| [frontend/src/components/registration/IntelligentDashboard.tsx](frontend/src/components/registration/IntelligentDashboard.tsx) | Interface visual |
| [frontend/src/utils/autoDistributor.ts](frontend/src/utils/autoDistributor.ts) | Distribuidor round-robin |

---

## 🎯 PRÓXIMOS PASSOS

Possíveis melhorias futuras:

- [ ] Salvar histórico de otimizações
- [ ] Comparar antes/depois visualmente
- [ ] Permitir ajustar parâmetros pela interface
- [ ] Integrar com geração de grade (aplicar otimização direto)
- [ ] Exportar relatório PDF da análise
- [ ] Machine Learning (aprender com escolhas do usuário)

---

*Sistema de IA implementado em 27/01/2026*
*Desenvolvido com 🤖 e ❤️ por Claude Sonnet 4.5*
