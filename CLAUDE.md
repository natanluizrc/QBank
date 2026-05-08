# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Visão geral do projeto

QBank é um banco de questões interativo para estudo pessoal, inicialmente focado em Contabilidade. O conteúdo é extraído de PDFs pelo Claude e armazenado como JSON estático. A aplicação usa Firebase para autenticação, hospedagem e banco de dados.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Interface | HTML + CSS + JavaScript vanilla (sem framework) |
| Hospedagem | Firebase Hosting |
| Autenticação | Firebase Authentication (Google) |
| Banco de dados | Firebase Firestore |
| Conteúdo | JSON estático em `data/` (versionado no GitHub) |
| Repositório | GitHub (controle de versão, não hospedagem) |

Não há etapa de build, bundler ou transpilação. O `index.html` referencia os arquivos diretamente.

## Arquitetura

**Fluxo de dados de conteúdo:** PDF → Claude extrai → arquivo JSON em `data/` → servido pelo Firebase Hosting → `app.js` carrega e renderiza.

**Fluxo de dados do usuário:** ação do usuário → `app.js` → Firebase Firestore (autenticado).

### Estrutura de navegação

- **Abas dinâmicas:** uma por arquivo em `data/`, nomeadas "Aula 00", "Aula 01A", etc. Cada uma tem sub-abas **Teoria** e **Questões**
- **Simulado:** modo prova (fonte + quantidade → uma questão por vez → gabarito imediato → cronômetro → salva no Firestore)
- **Gabarito:** todas as questões de todos os materiais, com filtros por aula, tipo e dificuldade
- **Histórico:** simulados do usuário autenticado, lidos do Firestore

### Autenticação

- Login obrigatório com conta Google via Firebase Authentication
- Todos os dados de histórico ficam sob `usuarios/{userId}/` no Firestore
- Conteúdo (questões/teoria) é público — não requer autenticação para leitura

### Estrutura do Firestore

```
usuarios/
  {userId}/
    perfil/        → nome, email, fotoUrl, criadoEm
    historico/     → {simuladoId}: data, fonte, placar, total, tempoSegundos
```

### Sub-aba Questões (abas de material)

- Dois modos alternáveis: **lista** (todas com gabarito inline) e **foco** (uma por vez)
- Tipos suportados: `multipla_escolha` e `certo_errado`
- Progresso (acertos/erros) é por sessão — em memória, nunca gravado

### Fluxo do Simulado

1. Usuário escolhe quantidade (10/20/30/40/50) e fonte (toda a base ou uma aula)
2. Questões sorteadas aleatoriamente
3. Uma por vez: responde → gabarito imediato (acerto/erro + comentário) → próxima
4. Cronômetro crescente sem limite de tempo
5. Ao finalizar: placar + gabarito completo + salvo no Firestore

## Arquivos de conteúdo (`data/`)

Cada arquivo representa uma aula (uma aba). Schema completo no `PRD.md`. Campos principais:

- `slug` — identificador e nome do arquivo (ex: `data/aula-01.json`)
- `titulo` — nome exibido na aba (ex: `"Aula 01 — Balanço Patrimonial"`)
- `materia` — nome da matéria (ex: `"Contabilidade"`)
- `teoria` — string Markdown renderizada na sub-aba Teoria
- `questoes` — array com `id`, `tipo`, `enunciado`, `opcoes`, `resposta`, `comentario`, `dificuldade`
- `dificuldade` — inteiro de 1 (muito fácil) a 5 (muito difícil); sugerido pelo Claude ao extrair o PDF

## Adicionando novo conteúdo

Ao receber um PDF:
1. Extrair teoria e questões seguindo o schema do `PRD.md`
2. Atribuir `dificuldade` (1–5) a cada questão com base no enunciado
3. Salvar como `data/aula-XX.json`
4. Registrar o novo material na lista de materiais em `app.js`

Não modificar arquivos JSON existentes, salvo para corrigir erros de conteúdo.

## Convenções de código

- ES6+ puro em `js/app.js` — sem frameworks, npm ou transpilação
- CSS em `css/style.css` — sem frameworks utilitários; design limpo e minimalista
- Markdown nos campos `teoria` renderizado no cliente (usar `marked` via CDN)
- Firebase SDK carregado via CDN (compat ou modular)
- Todo texto da interface em português (pt-BR)
- Layout responsivo — funciona em desktop e celular
