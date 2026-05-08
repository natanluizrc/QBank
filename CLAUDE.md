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
[ Matéria ▼ ]   Simulado   Gabarito   Histórico   ← barra superior (fixa)
────────────────────────────────────────────────────
  Aula 00   Aula 01A   Aula 01B   Aula 02  ...     ← barra secundária (por matéria)
────────────────────────────────────────────────────
  [ Teoria ]   [ Questões ]                        ← sub-abas da aula ativa
```

- **Seletor de matéria:** dropdown que troca as abas de Aula exibidas na barra secundária
- **Simulado / Gabarito / Histórico:** abas globais — operam em toda a base, independente da matéria selecionada

## Regras de exibição de questões

| Contexto | Comportamento |
|----------|--------------|
| Sub-aba Questões (Aula) | **Todas** as questões da aula são exibidas sempre |
| Simulado | Quantidade configurável pelo usuário (10/20/30 para aula/matéria; até 50 para toda a base) |
| Gabarito | Todas as questões de todas as matérias, com filtros |

A sub-aba Questões tem dois modos alternáveis: **lista** (scroll + gabarito inline) e **foco** (uma por vez → responde → gabarito imediato → próxima). Progresso é session-only — nunca gravado.

## Fluxo do Simulado

1. Usuário configura fonte (toda a base / matéria / aula) e quantidade
2. Questões sorteadas aleatoriamente
3. Uma por vez: responde → gabarito imediato (acerto/erro + comentário) → próxima
4. Cronômetro crescente, sem limite de tempo
5. Ao finalizar: placar + gabarito completo + salvo no Firestore (`usuarios/{userId}/historico`)

## Estrutura do Firestore

```
usuarios/
  {userId}/
    perfil/         → nome, email, fotoUrl, criadoEm
    historico/
      {simuladoId}/ → data, fonte, materia, placar, total, tempoSegundos
```

## Arquivos de conteúdo

Organizados por matéria em `data/{materia}/aula-XX.json`. Schema completo no `PRD.md`:

- `slug` — identificador do arquivo (ex: `aula-01`)
- `titulo` — nome na aba (ex: `"Aula 01 — Balanço Patrimonial"`)
- `materia` — nome da matéria (ex: `"Contabilidade"`)
- `teoria` — Markdown renderizado na sub-aba Teoria
- `questoes[]` — cada item tem: `id`, `tipo`, `enunciado`, `opcoes`, `resposta`, `comentario`, `dificuldade`
- `tipo`: `"multipla_escolha"` ou `"certo_errado"`
- `dificuldade`: inteiro de 1 (muito fácil) a 5 (muito difícil)

## Adicionando novo conteúdo (fluxo padrão)

Quando o usuário enviar um PDF:
1. Extrair teoria e questões seguindo o schema do `PRD.md`
2. Atribuir `dificuldade` (1–5) a cada questão com base no enunciado
3. Salvar em `data/{materia}/aula-XX.json`
4. Registrar o material na lista de materiais em `app.js`
5. Cada material deve ter no mínimo 30 questões

Não modificar arquivos JSON existentes, salvo para corrigir erros reportados pelo usuário.

## Convenções de código

- ES6+ puro em `js/app.js` — sem frameworks ou npm
- CSS em `css/style.css` — design limpo e minimalista, fundo branco, sem cor de destaque
- Markdown nos campos `teoria` renderizado no cliente (usar `marked` via CDN)
- Todo texto da interface em português (pt-BR)
- Layout responsivo — desktop e celular
