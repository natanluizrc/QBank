# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Visão geral do projeto

QBank é um banco de questões interativo para estudo pessoal, inicialmente focado em Contabilidade. Conteúdo extraído de PDFs pelo Claude, armazenado como JSON estático. Firebase para autenticação, hospedagem e banco de dados do usuário.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Interface | HTML + CSS + JavaScript vanilla (sem framework) |
| Hospedagem | Firebase Hosting |
| Autenticação | Firebase Authentication (Google) |
| Banco de dados | Firebase Firestore |
| Conteúdo | JSON estático em `data/` (versionado no GitHub) |
| Repositório | GitHub (controle de versão apenas) |

Sem build, sem bundler, sem transpilação. Firebase SDK via CDN.

## Arquitetura de navegação

```
  Início   Simulado   Histórico   Salvos        ← topbar (abas globais)
──────────────────────────────────────────────
  ContG   ContC   ContT   ...                   ← barra de matérias (nível 1)
──────────────────────────────────────────────
  Aula 00   Aula 01A   Aula 01B   Aula 02  ...  ← barra de aulas (nível 2, oculta em abas globais)
```

- **Início:** aba padrão — exibe as aulas da matéria ativa
- **Barra de matérias:** botões que trocam a matéria ativa e voltam ao Início
- **Barra de aulas:** visível apenas quando `tabGlobal === null` (Início)
- **Simulado / Histórico / Salvos:** abas globais — operam independente da matéria

Não há sub-abas de Questões/Teoria — a aula abre direto nas questões.

## Modos de questões

Dois modos alternáveis com **barra de informação unificada** acima das questões:

- **Modo lista** — placar à esq. + `Expandir tudo` à dir.; scroll com gabaritos inline interativos
- **Modo foco** — placar à esq. + div vazio à dir.; uma questão por vez → responde → gabarito imediato → próxima

**Placar** (chips coloridos com fonte mono, números zero-padded 3 dígitos):
- Chip azul `#dbeafe / #1d4ed8` — total de questões
- Chip verde `#dcfce7 / #15803d` — acertos
- Chip vermelho `#fee2e2 / #b91c1c` — erros

Progresso é session-only — nunca gravado. Ambos os modos exibem `Q1`, `Q2`... na meta da questão. Na aba Salvos, o número original da aula-fonte é preservado via `_qNum`.

## Botão Salvar/Salvo

Cada questão tem um botão de marcação na meta:
- **Salvar** — borda cinza `#d1d5db`, texto cinza `#9ca3af`; hover revela amarelo `#f59e0b`
- **Salvo** — borda e texto amarelo `#f59e0b`, fundo `#fffbeb`

Ao clicar em Salvar, a questão entra em `revisaoQuestoes[]` (cache em memória) e no Firestore. Ao clicar em Salvo, é removida de ambos. A atualização do Firestore é fire-and-forget (`.catch()`) — a UI sempre responde imediatamente.

## Aba Salvos

Exibe as questões salvas usando o cache local `revisaoQuestoes[]` — sem fetch do Firestore, resposta imediata. Suporta modo lista e foco. Ao desmarcar uma questão dentro da aba, o card é removido do DOM na hora. Mostra `_materia` e `_aula` de origem na meta de cada questão.

## Autenticação

- Usuário não autenticado vê tela de boas-vindas com botão "Entrar com Google"
- Após login, redirecionado para o app; `carregarRevisao()` popula `revisaoIds` e `revisaoQuestoes` do Firestore
- Todo acesso ao Firestore exige autenticação

## Fluxo do Simulado

1. Usuário configura fonte (matéria ou aula) e quantidade (10 / 20 / 30)
2. Questões sorteadas aleatoriamente
3. Uma por vez: responde → gabarito imediato (acerto/erro + comentário) → próxima
4. Cronômetro crescente, sem limite de tempo
5. Ao finalizar: placar + gabarito completo + salvo no Firestore (`usuarios/{userId}/historico`)
6. No Histórico, clicar num simulado exibe o gabarito completo daquele simulado

## Estrutura do Firestore

```
usuarios/
  {userId}/
    perfil/              → nome, email, fotoUrl, criadoEm
    historico/
      {simuladoId}/      → data, fonte, placar, total, tempoSegundos, questoes[]
    revisao/
      {questaoId}/       → todos os campos da questão + _materia, _aula, _qNum, marcadoEm
```

Regras em `firestore.rules` — permite leitura/escrita em todas as subcoleções do próprio usuário. Deploy: `firebase deploy --only firestore:rules`.

## Arquivos de conteúdo

Organizados por matéria em `data/{materia}/aula-XX.json` — slug da matéria em minúsculas sem acentos (ex: `data/contabilidade/`).

- `slug` — identificador do arquivo (ex: `aula-01a`)
- `titulo` — nome na aba (ex: `"Aula 01A"`)
- `materia` — nome da matéria (ex: `"ContG"`)
- `teoria` — Markdown renderizado (disponível mas sem sub-aba dedicada)
- `questoes[]` — cada item tem: `id`, `banca`, `tipo`, `enunciado`, `resposta`, `comentario`, `dificuldade`
  - `banca`: string com identificação da banca/concurso — exibida acima do enunciado em cinza
  - `opcoes`: presente **somente** em `multipla_escolha` (array de strings: `["A) ...", "B) ...", ...]`)
  - `tipo`: `"multipla_escolha"` ou `"certo_errado"`
  - `resposta` em `multipla_escolha`: letra maiúscula — `"A"`, `"B"`, `"C"`, `"D"` ou `"E"`
  - `resposta` em `certo_errado`: `"certo"` ou `"errado"` (string minúscula)
  - `dificuldade`: inteiro de 1 (muito fácil) a 5 (muito difícil) — exibido como estrelas (★★☆☆☆)

Diagramas no enunciado usam caracteres box-drawing Unicode (`┌┐└┘│─┬┴┼├┤`) — detectados por regex e renderizados em `<pre class="diagrama">` com fonte monoespaçada.

## Adicionando novo conteúdo (fluxo padrão)

Quando o usuário enviar um PDF:
1. Extrair texto com `pdftotext -enc UTF-8` via Bash
2. Questões: extrair da seção "Lista de Questões" do PDF; comentários da seção "Questões Comentadas"
3. Teoria: síntese estruturada em Markdown — não cópia fiel; cobre definições, classificações, tabelas, normas; omite exemplos do professor
4. Atribuir `dificuldade` (1–5) a cada questão
5. Campo `banca` separado do `enunciado` — nunca embutir a banca dentro do texto da questão
6. IDs no formato `cg-XX-NN` (matéria abreviada + número da aula + número da questão)
7. Salvar em `data/{materia}/aula-XX.json`
8. Registrar o material na lista `MATERIAS` em `app.js`
9. Cada material deve ter no mínimo 30 questões

Não modificar arquivos JSON existentes, salvo para corrigir erros reportados pelo usuário.

## Convenções de código

- ES6+ puro em `js/app.js` — sem frameworks ou npm
- CSS em `css/style.css` — design minimalista, fundo branco
- Paleta funcional: verde `#16a34a` / vermelho `#dc2626` (acerto/erro), azul `#2563eb` (total), amarelo `#f59e0b` (Salvar/Salvo), preto `#1a1a1a` (UI geral)
- Markdown nos campos `teoria` renderizado no cliente (usar `marked` via CDN)
- Todo texto da interface em português (pt-BR)
- Layout responsivo — desktop e celular
