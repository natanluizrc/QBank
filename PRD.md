# PRD — QBank

## Objetivo

Banco de questões interativo para estudo, com foco inicial em Contabilidade. O conteúdo é extraído de apostilas em PDF e organizado em abas por material, com explicação teórica e questões comentadas.

## Público-alvo

Uso pessoal — estudante de Contabilidade (e futuramente outras matérias).

## Funcionalidades principais (MVP)

### Estrutura de navegação
- Cada PDF importado vira uma **aba** principal na interface
- Cada aba tem duas **sub-abas**:
  - **Teoria** — conteúdo teórico extraído do PDF, revisado pelo Claude
  - **Questões** — questões comentadas extraídas do PDF

### Questões interativas
- Exibir enunciado e alternativas
- Usuário seleciona uma resposta
- Ao confirmar, exibir: acerto/erro + comentário explicativo
- Suporte a múltipla escolha e Certo/Errado (formatos mais comuns em apostilas)

### Extração de conteúdo
- PDFs são enviados ao Claude, que extrai e formata o conteúdo
- Dados salvos em arquivos JSON (um por aba/material)
- Nenhum backend necessário — solução 100% estática

## Futuro (fora do MVP)

- Outras matérias além de Contabilidade
- Filtros por tema, dificuldade, banca
- Progresso e histórico de respostas (localStorage)
- Modo simulado (tempo, pontuação)
- Marcação de questões para revisão

## Fora do escopo (por ora)

- Login / autenticação
- Banco de dados remoto
- Upload automático de PDFs pelo usuário

## Stack técnica

- HTML + CSS + JavaScript (vanilla, sem framework)
- Dados em JSON estáticos
- Hospedagem: GitHub Pages (futuramente)

## Estrutura de arquivos planejada

```
QBank/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   └── [slug-do-material].json
├── PRD.md
└── CLAUDE.md
```

## Formato do JSON de cada material

```json
{
  "title": "Nome do Material",
  "slug": "slug-do-material",
  "subject": "Contabilidade",
  "theory": "Conteúdo teórico em Markdown...",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "statement": "Enunciado da questão...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "answer": "A",
      "commentary": "Explicação da resposta correta..."
    }
  ]
}
```
