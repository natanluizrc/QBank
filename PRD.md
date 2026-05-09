# PRD — QBank

## Objetivo

Banco de questões interativo para estudo pessoal, inicialmente focado em Contabilidade. O conteúdo é extraído de apostilas em PDF pelo Claude e organizado por matéria e aula, com questões comentadas, simulados cronometrados, marcação de questões para revisão e histórico de desempenho por usuário.

## Público-alvo

Uso pessoal. Arquitetura multi-usuário desde o início (dados isolados por `userId` no Firestore).

---

## Estrutura de navegação

```
  Início   Fixadas   Simulado   Histórico       ← topbar sticky
──────────────────────────────────────────────
  ContG   ContC   ContT   ...                   ← barra de matérias sticky
──────────────────────────────────────────────
  Aula 00   Aula 01A   Aula 01B   Aula 02  ...  ← barra de aulas sticky
──────────────────────────────────────────────
  [000] [000] [000]   Expandir tudo             ← barra de placar sticky
```

### Topbar (abas globais)
| Aba | Comportamento |
|-----|---------------|
| **Início** | Aba padrão — reseta para primeira matéria + primeira aula ao clicar |
| **Fixadas** | Exibe questões marcadas; pré-seleciona primeira aula como filtro |
| **Simulado** | Modo prova configurável |
| **Histórico** | Lista de simulados anteriores |

### Barra de matérias
- Uma tag por matéria registrada em `MATERIAS`; ativa com underline preto
- Ao clicar: troca matéria ativa, reseta para Início + primeira aula

### Barra de aulas
- Visível em **Início** e **Fixadas** (oculta em Simulado e Histórico)
- Em Início: seleciona aula ativa (carga das questões)
- Em Fixadas: funciona como filtro por aula (toggle — clicar na ativa desativa o filtro)

### Barra de placar
- Sticky abaixo das três barras superiores (topo 136px desktop / 132px mobile)
- Chips coloridos zero-padded (3 dígitos): azul = total, verde = acertos, vermelho = erros
- Botão "Expandir tudo / Recolher tudo" à direita
- Progresso session-only — nunca persiste

---

## Modo de questões (lista)

Todas as questões da aula são exibidas em scroll contínuo.

### Cada questão exibe:
- Meta: número `Q1`, `Q2`... · estrelas de dificuldade (★★☆☆☆) · tipo · botão Fixar
- Em Fixadas: também exibe matéria e aula de origem (`_materia — _aula`)
- `(Banca/Concurso/Ano)` acima do enunciado em cinza
- Enunciado + opções de resposta
- Botão "Ver gabarito" (laranja, contorno → preenchido ao abrir)

### Interação:
- Clicar na opção/botão CE revela gabarito imediatamente + atualiza placar
- Opções ficam desabilitadas após resposta
- Gabarito pode ser expandido/recolhido manualmente a qualquer momento

---

## Botão Fixar / Fixada

Presente na meta de cada questão (Início, Fixadas e Simulado).

- **Fixar** — borda amarela `#f59e0b`, texto amarelo; hover fundo amarelo claro
- **Fixada** — fundo amarelo sólido, texto branco; hover amarelo escuro `#d97706`

Ao fixar: questão salva em `revisaoQuestoes[]` (cache) e no Firestore (fire-and-forget).  
Ao desmarcar na aba Fixadas: card removido do DOM imediatamente.

---

## Aba: Simulado

### Configuração
- **Fonte:** matéria inteira ou aula específica
- **Quantidade:** 10 / 20 / 30 questões (sorteadas aleatoriamente do pool)

### Durante o simulado
- Uma questão por vez, com numeração `Q1`, `Q2`...
- Cabeçalho sem exibir matéria/aula
- Barra sticky: placar (azul/verde/vermelho) à esq. + cronômetro crescente à dir.
- Ao responder: gabarito imediato com acerto/erro + comentário → botão "Próxima →"
- Botão Fixar disponível em cada questão

### Ao finalizar
- Tela de resultado: `X / N` + percentual + tempo total
- Gabarito completo de todas as questões
- Simulado salvo automaticamente no Firestore
- Botão "Novo Simulado"

---

## Aba: Histórico

- Lista de simulados em ordem cronológica decrescente: data, total de questões, tempo, placar
- Clicar num item abre o gabarito completo daquele simulado
- Botão "← Histórico" para voltar à lista
- Botão "Limpar histórico" com confirmação
- Dados no Firestore — acessíveis de qualquer dispositivo

---

## Autenticação

- Usuário não autenticado vê tela de boas-vindas com botão "Entrar com Google"
- Login via Firebase Authentication (Google)
- Após autenticação: `carregarRevisao()` popula cache local com questões fixadas do Firestore
- Todo acesso ao Firestore exige autenticação

---

## Arquitetura técnica

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Interface | HTML + CSS + JavaScript vanilla (sem framework, sem bundler) |
| Hospedagem | Firebase Hosting |
| Autenticação | Firebase Authentication (Google) |
| Banco de dados | Firebase Firestore |
| Conteúdo | JSON estático em `data/` (versionado no GitHub) |
| Repositório | GitHub |

Firebase SDK e `marked` via CDN. Sem build step.

### Estrutura do Firestore

```
usuarios/
  {userId}/
    perfil/
      dados/           → nome, email, fotoUrl, criadoEm
    historico/
      {simuladoId}/    → data, fonte, placar, total, tempoSegundos, questoes[]
    revisao/
      {questaoId}/     → id, banca, tipo, enunciado, opcoes, resposta, comentario,
                          dificuldade, _materia, _materiaId, _aula, _slug, _qNum, marcadoEm
```

---

## Schema JSON de cada aula

```json
{
  "slug": "aula-01a",
  "titulo": "Aula 01A",
  "materia": "ContG",
  "teoria": "Conteúdo teórico em Markdown (disponível, sem sub-aba dedicada)",
  "questoes": [
    {
      "id": "cg-01-01",
      "banca": "FGV/PC-AM/Investigador/2022",
      "tipo": "multipla_escolha",
      "enunciado": "Enunciado da questão...",
      "opcoes": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "resposta": "A",
      "comentario": "Explicação...",
      "dificuldade": 3
    },
    {
      "id": "cg-01-02",
      "banca": "CESPE/TCU/Analista/2019",
      "tipo": "certo_errado",
      "enunciado": "Assertiva para julgamento...",
      "resposta": "certo",
      "comentario": "Explicação...",
      "dificuldade": 2
    }
  ]
}
```

**Notas:**
- `id`: formato `cg-XX-NN` — matéria abreviada + nº aula (2 dígitos) + nº questão (2 dígitos)
- `banca`: separado do enunciado — nunca embutir no texto
- `opcoes`: presente apenas em `multipla_escolha`
- `resposta` em `certo_errado`: `"certo"` ou `"errado"` (minúsculo)
- `resposta` em `multipla_escolha`: letra maiúscula — `"A"` a `"E"`
- `dificuldade`: 1 (muito fácil) a 5 (muito difícil)

---

## Fluxo de adição de conteúdo

1. Usuário envia o PDF no chat com Claude
2. Claude extrai o texto com `pdftotext -enc UTF-8` via Bash
3. Questões: extraídas da seção "Lista de Questões"; comentários da "Questões Comentadas"
4. Teoria: síntese estruturada em Markdown (definições, classificações, tabelas, normas)
5. Claude atribui `dificuldade` (1–5) e separa `banca` do `enunciado`
6. Arquivo salvo em `data/{materia}/aula-XX.json`
7. Material registrado em `MATERIAS` no `app.js`
8. Mínimo de 30 questões por material

---

## Fora do escopo atual

- Sub-aba Teoria (campo existe no JSON mas não é exibido)
- Modo Foco por aula (substituído pelo Simulado)
- Simulado com toda a base como fonte
- Upload de PDFs pela interface
- Edição de questões pela interface
- Cadastro manual (só Google)
