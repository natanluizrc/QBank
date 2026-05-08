# PRD — QBank

## Objetivo

Banco de questões interativo para estudo pessoal, inicialmente focado em Contabilidade. O conteúdo é extraído de apostilas em PDF pelo Claude e organizado por matéria e aula, com explicação teórica, questões comentadas, simulados cronometrados e histórico de desempenho por usuário.

## Público-alvo

Inicialmente uso pessoal. Arquitetura preparada para múltiplos usuários desde o MVP.

---

## Estrutura de navegação

```
[ Matéria ▼ ]   Início   Simulado   Histórico
─────────────────────────────────────────────────────
  Aula 00   Aula 01A   Aula 01B   Aula 02  ...
─────────────────────────────────────────────────────
  [ Questões ]   [ Teoria ]
```

### Barra superior (fixa)
| Elemento | Tipo | Descrição |
|----------|------|-----------|
| **Seletor de matéria** | Dropdown | Troca a matéria ativa — muda as abas de Aula abaixo |
| **Início** | Aba global | Volta para a view de aulas (aba padrão ao entrar no app) |
| **Simulado** | Aba global | Modo prova com fonte e quantidade configuráveis |
| **Histórico** | Aba global | Todos os simulados do usuário |

### Barra secundária (muda conforme matéria selecionada)
- Uma aba por aula da matéria ativa: **Aula 00, Aula 01A, Aula 01B, Aula 02...**
- Cada aba de aula tem duas sub-abas: **Questões** (padrão) e **Teoria**

---

## Abas de Aula

### Sub-aba: Questões (padrão)
- **Todas as questões da aula são exibidas sempre** (sem seleção de quantidade)
- Dois modos alternáveis por botão, com **barra de informação unificada** abaixo dos botões:

#### Modo Lista
- Barra: `N questões` (esquerda) · `Expandir tudo / Recolher tudo` (direita, link sublinhado)
- Scroll com todas as questões — cada uma tem gabarito inline interativo
- Responder clicando na opção revela gabarito com feedback visual (verde/vermelho)
- "Expandir tudo" abre todos os gabaritos de uma vez para revisão rápida

#### Modo Foco
- Barra: `X / N` em negrito (esquerda) · placar `✓ verde` / `✗ vermelho` (direita)
- Uma questão por vez: responde → gabarito imediato (acerto/erro + comentário) → avança
- Ao final: tela de conclusão com resultado da sessão

#### Campos exibidos em cada questão (ambos os modos)
- Número `Q1`, `Q2`... · estrelas de dificuldade (★★☆☆☆) · tipo
- `(Banca/Concurso/Ano)` em destaque acima do enunciado
- Enunciado + opções (ou botões Certo/Errado)

Progresso da sessão não persiste ao recarregar.

### Sub-aba: Teoria
- Conteúdo teórico extraído do PDF, sintetizado e formatado pelo Claude
- Renderizado em Markdown

---

## Aba: Simulado

### Configuração antes de iniciar
- **Fonte:** Matéria específica | Aula específica
- **Quantidade:** 10 / 20 / 30 questões

> Cada material terá no mínimo 30 questões, garantindo que todas as opções de quantidade estejam disponíveis.

### Durante o simulado
- Uma questão por vez com número `Q1`, `Q2`...
- Ao marcar a resposta → gabarito imediato (acerto/erro + comentário)
- Avança para a próxima
- Cronômetro crescente visível (sem limite — não encerra automaticamente)

### Ao finalizar
- Tela de resultado: placar (ex: 14/20 — 70%) + tempo total
- Gabarito completo com comentários
- Simulado salvo automaticamente no Firestore (vinculado ao usuário)

---

## Aba: Histórico

- Lista de todos os simulados do usuário: data, fonte, placar, tempo
- Clicar num simulado abre o **gabarito completo** daquele simulado (todas as questões com resposta dada, acerto/erro e comentário)
- Escopo global (todas as matérias)
- Botão para limpar histórico
- Dados no Firestore, acessíveis de qualquer dispositivo

---

## Autenticação

- Usuário não autenticado vê uma **tela de boas-vindas** com botão "Entrar com Google"
- Login obrigatório com conta Google (Firebase Authentication)
- Após autenticação, redirecionado para o app
- Todos os dados do usuário ficam isolados em `usuarios/{userId}/` no Firestore

---

## Arquitetura técnica

### Stack

| Camada | Tecnologia | Custo |
|--------|-----------|-------|
| Interface | HTML + CSS + JavaScript (vanilla) | — |
| Hospedagem | Firebase Hosting | Gratuito |
| Autenticação | Firebase Authentication (Google) | Gratuito |
| Banco de dados | Firebase Firestore | Gratuito |
| Controle de versão | GitHub | Gratuito |
| Conteúdo | JSON estático em `data/` | — |

### Estrutura do Firestore

```
usuarios/
  {userId}/
    perfil/         → nome, email, fotoUrl, criadoEm
    historico/
      {simuladoId}/ → data, fonte, materia, placar, total, tempoSegundos
```

### Conteúdo (questões e teoria)

- Arquivos JSON estáticos em `data/{materia}/aula-XX.json` — slug da matéria em minúsculas sem acentos (ex: `data/contabilidade/`)
- Servidos pelo Firebase Hosting
- Versionados no GitHub
- Futuramente podem migrar para Firestore (ex: conteúdo personalizado por usuário)

---

## Schema JSON de cada aula

```json
{
  "titulo": "Aula 01 — Nome do Tema",
  "slug": "aula-01",
  "materia": "Contabilidade",
  "teoria": "Conteúdo teórico em Markdown...",
  "questoes": [
    {
      "id": "cg-01-01",
      "banca": "FGV/PC-AM/Investigador de Polícia/2022",
      "tipo": "multipla_escolha",
      "enunciado": "Enunciado da questão...",
      "opcoes": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "resposta": "A",
      "comentario": "Explicação da resposta correta...",
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

**Notas sobre o schema:**
- **`id`:** formato `cg-XX-NN` — matéria abreviada + número da aula (dois dígitos) + número da questão (dois dígitos)
- **`banca`:** identificação completa separada do enunciado — nunca embutir no texto da questão
- **`dificuldade`:** escala de 1 (muito fácil) a 5 (muito difícil) — atribuído pelo Claude; exibido como estrelas ★
- **`opcoes`:** presente apenas em `multipla_escolha`; ausente em `certo_errado`
- **`resposta` em `certo_errado`:** `"certo"` ou `"errado"` (string, minúsculo)
- **`resposta` em `multipla_escolha`:** letra maiúscula — `"A"`, `"B"`, `"C"`, `"D"` ou `"E"`

---

## Identidade visual

- Design limpo e minimalista — fundo branco, tipografia clara
- Sem logo, sem cor de destaque decorativa
- Verde (#16a34a) e vermelho (#dc2626) usados exclusivamente para feedback de acerto/erro
- Responsivo — funciona em desktop e celular

---

## Fluxo de adição de conteúdo

1. Usuário envia o PDF diretamente no chat com Claude
2. Claude extrai o texto com `pdftotext -enc UTF-8` via Bash
3. Questões extraídas da seção "Lista de Questões"; comentários da seção "Questões Comentadas"
4. Teoria: síntese estruturada em Markdown — definições, classificações, tabelas, normas; omite exemplos do professor
5. Claude atribui `dificuldade` (1–5) e separa `banca` do `enunciado`
6. Arquivo salvo em `data/{materia}/aula-XX.json`
7. Material registrado na lista de materiais em `app.js`

---

## Plano de evolução

| Fase | Funcionalidade |
|------|---------------|
| MVP | Login Google + matérias + aulas (Questões + Teoria) + simulado + histórico |
| Fase 2 | Progresso persistido por usuário, marcar questões para revisão, filtros avançados |
| Fase 3 | Questões no Firestore, conteúdo personalizável, permissões por usuário |

---

## Fora do escopo no MVP

- Cadastro manual (só login Google)
- Upload de PDFs pelo usuário pela interface
- Modo administrador para gerenciar conteúdo pela interface
- Edição de questões pela interface
- Simulado com "Toda a base" como fonte (disponível a partir da Fase 2)
