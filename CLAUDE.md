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
[ Matéria ▼ ]   Início   Simulado   Histórico   ← barra superior (fixa)
────────────────────────────────────────────────────
  Aula 00   Aula 01A   Aula 01B   Aula 02  ...     ← barra secundária (por matéria)
────────────────────────────────────────────────────
  [ Questões ]   [ Teoria ]                        ← sub-abas da aula ativa
```

- **Início:** aba padrão — exibe as aulas da matéria selecionada
- **Seletor de matéria:** dropdown que troca as abas de Aula exibidas na barra secundária
- **Simulado / Histórico:** abas globais — operam independente da matéria selecionada
- **Sub-aba padrão ao entrar em uma aula:** Questões (não Teoria)

## Regras de exibição de questões

| Contexto | Comportamento |
|----------|--------------|
| Sub-aba Questões (Aula) | **Todas** as questões da aula são exibidas sempre |
| Simulado | Quantidade configurável: 10 / 20 / 30 — fonte: matéria ou aula |

A sub-aba Questões tem dois modos alternáveis com **barra de informação unificada**:

- **Modo lista** — barra mostra `N questões` (esq.) + `Expandir tudo` (dir.); scroll com gabaritos inline interativos
- **Modo foco** — barra mostra `X / N` em negrito (esq.) + placar `✓ verde / ✗ vermelho` (dir.); uma questão por vez → responde → gabarito imediato → próxima

Progresso é session-only — nunca gravado. Ambos os modos exibem `Q1`, `Q2`... na meta da questão.

## Autenticação

- Usuário não autenticado vê tela de boas-vindas com botão "Entrar com Google"
- Após login, redirecionado para o app
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
    perfil/         → nome, email, fotoUrl, criadoEm
    historico/
      {simuladoId}/ → data, fonte, materia, placar, total, tempoSegundos
```

## Arquivos de conteúdo

Organizados por matéria em `data/{materia}/aula-XX.json` — slug da matéria em minúsculas sem acentos (ex: `data/contabilidade/`). Schema completo no `PRD.md`.

- `slug` — identificador do arquivo (ex: `aula-01`)
- `titulo` — nome na aba (ex: `"Aula 01 — Balanço Patrimonial"`)
- `materia` — nome da matéria (ex: `"Contabilidade"`)
- `teoria` — Markdown renderizado na sub-aba Teoria
- `questoes[]` — cada item tem: `id`, `banca`, `tipo`, `enunciado`, `resposta`, `comentario`, `dificuldade`
  - `banca`: string com identificação da banca/concurso (ex: `"FGV/PC-AM/Investigador de Polícia/2022"`) — exibida acima do enunciado
  - `opcoes`: presente **somente** em `multipla_escolha` (array de strings: `["A) ...", "B) ...", ...]`)
  - `tipo`: `"multipla_escolha"` ou `"certo_errado"`
  - `resposta` em `multipla_escolha`: letra maiúscula — `"A"`, `"B"`, `"C"`, `"D"` ou `"E"`
  - `resposta` em `certo_errado`: `"certo"` ou `"errado"` (string minúscula)
  - `dificuldade`: inteiro de 1 (muito fácil) a 5 (muito difícil) — exibido como estrelas (★★☆☆☆)

## Adicionando novo conteúdo (fluxo padrão)

Quando o usuário enviar um PDF:
1. Extrair texto com `pdftotext -enc UTF-8` via Bash
2. Questões: extrair da seção "Lista de Questões" do PDF; comentários da seção "Questões Comentadas"
3. Teoria: síntese estruturada em Markdown — não cópia fiel; cobre definições, classificações, tabelas, normas; omite exemplos do professor
4. Atribuir `dificuldade` (1–5) a cada questão
5. Campo `banca` separado do `enunciado` — nunca embutir a banca dentro do texto da questão
6. IDs no formato `cg-XX-NN` (matéria abreviada + número da aula + número da questão)
7. Salvar em `data/{materia}/aula-XX.json`
8. Registrar o material na lista de materiais em `app.js`
9. Cada material deve ter no mínimo 30 questões

Não modificar arquivos JSON existentes, salvo para corrigir erros reportados pelo usuário.

## Convenções de código

- ES6+ puro em `js/app.js` — sem frameworks ou npm
- CSS em `css/style.css` — design limpo e minimalista, fundo branco; exceção: placar usa verde (#16a34a) e vermelho (#dc2626) por serem funcionais
- Markdown nos campos `teoria` renderizado no cliente (usar `marked` via CDN)
- Todo texto da interface em português (pt-BR)
- Layout responsivo — desktop e celular
