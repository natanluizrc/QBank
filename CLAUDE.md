# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Visão geral do projeto

QBank é um banco de questões estático para estudo pessoal. O conteúdo é extraído de apostilas em PDF pelo Claude e armazenado em JSON. Foco inicial em Contabilidade, com expansão planejada para outras matérias.

Não há etapa de build, gerenciador de pacotes ou backend — basta abrir o `index.html` no navegador ou servir com qualquer servidor de arquivos estáticos.

## Arquitetura

A aplicação é 100% estática: HTML + JS vanilla + CSS, com dados em arquivos JSON.

**Fluxo de dados:** PDF → Claude extrai o conteúdo → arquivo JSON em `data/` → `app.js` carrega e renderiza.

### Estrutura de navegação

Quatro tipos de abas na navegação principal:
1. **Abas de material** — uma por arquivo JSON em `data/`, cada uma com duas sub-abas (Teoria / Questões)
2. **Simulado** — modo prova cronometrado
3. **Revisão Geral** — todas as questões de todos os materiais com filtros
4. **Histórico** — resultados de simulados anteriores (persistidos em localStorage)

### Abas de material (sub-aba Questões)

- Dois modos alternáveis por botão: **lista** (todas as questões com gabarito inline) e **foco** (uma por vez — responde → feedback imediato → próxima)
- Progresso (acertos, respondidas, marcadas) é por sessão — reseta ao recarregar a página
- Tipos de questão suportados: `multipla_escolha` e `certo_errado`

### Fluxo do Simulado

1. Usuário escolhe quantidade de questões (10/20/30/40/50) e fonte (toda a base ou um material específico)
2. Questões são sorteadas aleatoriamente da fonte escolhida
3. Uma questão por vez: usuário responde → gabarito imediato (acerto/erro + comentário) → próxima
4. Cronômetro crescente (sem limite de tempo, sem encerramento automático)
5. Ao finalizar: tela de resultado + gabarito completo + salvamento automático no histórico

### Persistência

- `data/*.json` — conteúdo estático (questões + teoria)
- `localStorage` — somente histórico de simulados (chave `qbank_history`, array de `{date, source, score, total, timeSeconds}`)
- Progresso nas abas de material: apenas em memória, nunca gravado no localStorage

## Arquivos de dados

Cada arquivo em `data/` representa um material de estudo (uma aba). O schema completo está no `PRD.md`. Campos principais:
- `slug` — identificador da aba e nome do arquivo (ex: `data/contabilidade-basica.json`)
- `materia` — nome da matéria (ex: `"Contabilidade"`)
- `teoria` — string em Markdown renderizada na sub-aba Teoria
- `questoes` — array com `id`, `tipo`, `enunciado`, `opcoes` (para múltipla escolha), `resposta`, `comentario`
- Valores de `tipo`: `"multipla_escolha"` ou `"certo_errado"`

## Adicionando novo conteúdo

Quando o usuário fornecer um PDF, extrair o conteúdo e criar um novo arquivo JSON seguindo o schema do `PRD.md`. Salvar em `data/` e registrar o material na lista em `app.js`. Não modificar arquivos JSON existentes, salvo para corrigir erros de conteúdo.

## Convenções de código

- Sem frameworks, sem npm, sem transpilação — ES6+ puro em `js/app.js`
- CSS em `css/style.css` — sem frameworks utilitários; design limpo e minimalista
- Markdown nos campos `theory` renderizado no cliente (usar `marked` via CDN se necessário)
- Todo o texto da interface em português (pt-BR)
- IDs dentro de um arquivo JSON devem ser únicos no arquivo, mas não precisam ser únicos globalmente
- Layout responsivo (desktop e celular)
