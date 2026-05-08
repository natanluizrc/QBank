# PRD — QBank

## Objetivo

Banco de questões interativo para estudo pessoal, com foco inicial em Contabilidade. O conteúdo é extraído de apostilas em PDF pelo Claude e organizado em abas por material, com explicação teórica, questões comentadas, simulados cronometrados e histórico de desempenho.

## Público-alvo

Uso pessoal — estudante de Contabilidade (e futuramente outras matérias).

---

## Estrutura de navegação

A interface tem quatro tipos de abas fixas na navegação principal:

| Aba | Descrição |
|-----|-----------|
| **[Material]** | Uma aba por PDF importado (ex: "Aula 1 — Balanço Patrimonial") |
| **Simulado** | Modo prova com cronômetro e gabarito imediato |
| **Revisão Geral** | Todas as questões da base, com filtros |
| **Histórico** | Registro de simulados anteriores |

---

## Abas de material (uma por PDF)

Cada aba de material contém duas sub-abas:

### Sub-aba: Teoria
- Conteúdo teórico extraído do PDF, revisado e formatado pelo Claude
- Renderizado em Markdown

### Sub-aba: Questões
- Dois modos alternáveis por botão:
  - **Modo lista** — scroll contínuo com todas as questões e gabaritos inline
  - **Modo foco** — uma questão por vez; responde → vê gabarito → avança
- Suporte a múltipla escolha e Certo/Errado
- Indicadores de progresso por sessão: acertos, erros, questões marcadas para revisão
- **O progresso não persiste entre sessões** (zera ao recarregar a página)

---

## Aba: Simulado

### Configuração antes de iniciar
- Escolher número de questões: 10 / 20 / 30 / 40 / 50
- Escolher fonte: **Toda a base** ou **material específico**

### Durante o simulado
- Uma questão por vez
- Ao marcar uma resposta → gabarito imediato (acerto/erro + comentário)
- Avança automaticamente para a próxima
- Cronômetro visível contando o tempo (sem limite — não encerra automaticamente)

### Ao finalizar
- Tela de resultado: placar (ex: 14/20 — 70%) + tempo total
- Gabarito completo com comentários de todas as questões
- Simulado salvo automaticamente no Histórico (data, placar, tempo, fonte)

---

## Aba: Revisão Geral

- Lista única com **todas** as questões de todos os materiais
- Filtros disponíveis: por material, por tipo de questão
- Sem interação de resposta — foco em revisão editorial (checar erros de conteúdo ou diagramação)

---

## Aba: Histórico

- Lista de todos os simulados realizados: data, fonte, placar, tempo
- Botão para **limpar histórico**
- Dados persistidos em **localStorage** (sobrevive ao fechar o navegador)

---

## Persistência de dados

| Dado | Armazenamento |
|------|---------------|
| Questões e teoria | Arquivos JSON estáticos em `data/` |
| Histórico de simulados | localStorage |
| Progresso nas abas de material | **Não persiste** — reseta por sessão |

---

## Stack técnica

- HTML + CSS + JavaScript (vanilla, sem framework)
- Dados em JSON estáticos (um arquivo por material)
- localStorage para histórico
- Hospedagem: GitHub Pages (futuramente)
- Layout responsivo — funciona em desktop e celular
- Visual: limpo e minimalista

---

## Estrutura de arquivos

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

---

## Schema JSON de cada material

```json
{
  "titulo": "Nome do Material",
  "slug": "slug-do-material",
  "materia": "Contabilidade",
  "teoria": "Conteúdo teórico em Markdown...",
  "questoes": [
    {
      "id": 1,
      "tipo": "multipla_escolha",
      "enunciado": "Enunciado da questão...",
      "opcoes": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "resposta": "A",
      "comentario": "Explicação da resposta correta..."
    },
    {
      "id": 2,
      "tipo": "certo_errado",
      "enunciado": "Assertiva para julgamento...",
      "resposta": "certo",
      "comentario": "Explicação..."
    }
  ]
}
```

---

## Fora do escopo (por ora)

- Login / autenticação
- Banco de dados remoto
- Upload automático de PDFs pelo usuário
- Filtros por dificuldade ou banca
- Modo de marcação de questões para revisão posterior (futuro)
