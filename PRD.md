# PRD — QBank

## Objetivo

Banco de questões interativo para estudo pessoal, inicialmente focado em Contabilidade. O conteúdo é extraído de apostilas em PDF pelo Claude e organizado por matéria e aula, com explicação teórica, questões comentadas, simulados cronometrados e histórico de desempenho por usuário.

## Público-alvo

Inicialmente uso pessoal. Arquitetura preparada para múltiplos usuários desde o MVP.

---

## Estrutura de navegação

```
[ Contabilidade ▼ ]   Simulado   Gabarito   Histórico
─────────────────────────────────────────────────────
  Aula 00   Aula 01A   Aula 01B   Aula 02  ...
─────────────────────────────────────────────────────
  [ Teoria ]   [ Questões ]
```

### Barra superior (fixa)
| Elemento | Tipo | Descrição |
|----------|------|-----------|
| **Seletor de matéria** | Dropdown | Troca a matéria ativa — muda as abas de Aula abaixo |
| **Simulado** | Aba global | Modo prova (opera em toda a base, com filtros) |
| **Gabarito** | Aba global | Todas as questões de todas as matérias, com filtros |
| **Histórico** | Aba global | Todos os simulados do usuário |

### Barra secundária (muda conforme matéria selecionada)
- Uma aba por aula da matéria ativa: **Aula 00, Aula 01A, Aula 01B, Aula 02...**
- Cada aba de aula tem duas sub-abas: **Teoria** e **Questões**

---

## Abas de Aula

### Sub-aba: Teoria
- Conteúdo teórico extraído do PDF, revisado e formatado pelo Claude
- Renderizado em Markdown

### Sub-aba: Questões
- **Todas as questões da aula são exibidas sempre** (sem seleção de quantidade)
- Dois modos alternáveis por botão:
  - **Modo lista** — scroll com todas as questões e gabaritos inline
  - **Modo foco** — uma questão por vez; responde → gabarito imediato → avança
- Suporte a múltipla escolha e Certo/Errado
- Exibe dificuldade de cada questão (1 a 5)
- Progresso da sessão (acertos/erros) visível — não persiste ao recarregar

---

## Aba: Simulado

### Configuração antes de iniciar
- **Fonte:** Toda a base | Matéria específica | Aula específica
- **Quantidade:** 10 / 20 / 30 (para aula ou matéria) — 10 / 20 / 30 / 40 / 50 (para toda a base)

> Cada material terá no mínimo 30 questões, garantindo que todas as opções estejam sempre disponíveis.

### Durante o simulado
- Uma questão por vez
- Ao marcar a resposta → gabarito imediato (acerto/erro + comentário)
- Avança automaticamente para a próxima
- Cronômetro crescente visível (sem limite — não encerra automaticamente)

### Ao finalizar
- Tela de resultado: placar (ex: 14/20 — 70%) + tempo total
- Gabarito completo com comentários
- Simulado salvo automaticamente no Firestore (vinculado ao usuário)

---

## Aba: Gabarito

- Escopo global — exibe questões de **todas as matérias**
- Filtros: por matéria, por aula, por tipo de questão, por dificuldade
- Sem interação de resposta — foco em revisão editorial
- Erros encontrados são reportados ao Claude, que corrige o arquivo JSON

---

## Aba: Histórico

- Lista de todos os simulados do usuário: data, fonte, placar, tempo
- Escopo global (todas as matérias)
- Botão para limpar histórico
- Dados no Firestore, acessíveis de qualquer dispositivo

---

## Autenticação

- Login obrigatório com conta Google (Firebase Authentication)
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

- Arquivos JSON estáticos em `data/{materia}/aula-XX.json`
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
      "id": 1,
      "tipo": "multipla_escolha",
      "enunciado": "Enunciado da questão...",
      "opcoes": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "resposta": "A",
      "comentario": "Explicação da resposta correta...",
      "dificuldade": 3
    },
    {
      "id": 2,
      "tipo": "certo_errado",
      "enunciado": "Assertiva para julgamento...",
      "resposta": "certo",
      "comentario": "Explicação...",
      "dificuldade": 2
    }
  ]
}
```

**Campo `dificuldade`:** escala de 1 (muito fácil) a 5 (muito difícil). Atribuído pelo Claude ao extrair o PDF; pode ser revisado manualmente.

---

## Identidade visual

- Design limpo e minimalista
- Fundo branco, tipografia clara
- Sem logo, sem cor de destaque
- Responsivo — funciona em desktop e celular

---

## Fluxo de adição de conteúdo

1. Usuário envia o PDF diretamente no chat com Claude
2. Claude extrai teoria e questões, atribui dificuldade (1–5)
3. Claude gera o arquivo JSON no formato do schema acima
4. Arquivo salvo em `data/{materia}/aula-XX.json`
5. Material registrado na lista de materiais em `app.js`

---

## Plano de evolução

| Fase | Funcionalidade |
|------|---------------|
| MVP | Login Google + matérias + aulas + simulado + gabarito + histórico |
| Fase 2 | Progresso persistido por usuário, marcar questões para revisão, filtros avançados |
| Fase 3 | Questões no Firestore, conteúdo personalizável, permissões por usuário |

---

## Fora do escopo no MVP

- Cadastro manual (só login Google)
- Upload de PDFs pelo usuário pela interface
- Modo administrador para gerenciar conteúdo pela interface
- Edição de questões pela interface
