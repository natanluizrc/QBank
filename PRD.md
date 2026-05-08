# PRD — QBank

## Objetivo

Banco de questões interativo para estudo, com foco inicial em Contabilidade. O conteúdo é extraído de apostilas em PDF pelo Claude e organizado em abas por aula, com explicação teórica, questões comentadas, simulados cronometrados e histórico de desempenho por usuário.

## Público-alvo

Inicialmente uso pessoal. Arquitetura preparada para múltiplos usuários desde o início.

---

## Estrutura de navegação

| Aba | Tipo | Descrição |
|-----|------|-----------|
| **Aula 00, Aula 01A, Aula 01B...** | Dinâmica | Uma aba por material extraído de PDF |
| **Simulado** | Fixa | Modo prova com cronômetro |
| **Gabarito** | Fixa | Todas as questões da base com filtros |
| **Histórico** | Fixa | Simulados realizados pelo usuário |

---

## Abas de material (Aula XX)

Cada aba contém duas sub-abas:

### Sub-aba: Teoria
- Conteúdo teórico extraído do PDF, revisado e formatado pelo Claude
- Renderizado em Markdown

### Sub-aba: Questões
- Dois modos alternáveis por botão:
  - **Modo lista** — scroll com todas as questões e gabaritos inline
  - **Modo foco** — uma questão por vez; responde → gabarito imediato → avança
- Suporte a múltipla escolha e Certo/Errado
- Exibe dificuldade de cada questão (1 a 5)
- Progresso da sessão (acertos/erros) visível, mas não persistido

---

## Aba: Simulado

### Configuração antes de iniciar
- Quantidade de questões: 10 / 20 / 30 / 40 / 50
- Fonte: **Toda a base** ou **aula específica**

### Durante o simulado
- Uma questão por vez
- Ao marcar resposta → gabarito imediato (acerto/erro + comentário)
- Avança para a próxima automaticamente
- Cronômetro crescente visível (sem limite — não encerra automaticamente)

### Ao finalizar
- Tela de resultado: placar (ex: 14/20 — 70%) + tempo total
- Gabarito completo com comentários
- Simulado salvo automaticamente no Firestore (vinculado ao usuário)

---

## Aba: Gabarito

- Lista única com **todas** as questões de todos os materiais
- Filtros: por aula, por tipo de questão, por dificuldade
- Sem interação de resposta — foco em revisão editorial (checar erros de conteúdo ou diagramação)

---

## Aba: Histórico

- Lista de todos os simulados do usuário: data, fonte, placar, tempo
- Botão para limpar histórico
- Dados no Firestore, acessíveis de qualquer dispositivo

---

## Autenticação

- Login com conta Google (Firebase Authentication)
- Obrigatório para acessar o app
- Todos os dados de histórico ficam isolados por usuário no Firestore

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
| Conteúdo (questões/teoria) | JSON no repositório | — |

### Estrutura do Firestore

```
usuarios/
  {userId}/
    perfil/
      nome, email, fotoUrl, criadoEm
    historico/
      {simuladoId}/
        data, fonte, placar, total, tempoSegundos
```

### Conteúdo (questões e teoria)

- Armazenado como arquivos JSON estáticos em `data/`
- Servido pelo Firebase Hosting
- Versionado no GitHub
- Futuramente pode ser migrado para Firestore se necessário (ex: conteúdo personalizado por usuário)

---

## Schema JSON de cada material

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

## Plano de evolução

| Fase | Funcionalidade |
|------|---------------|
| MVP | Login Google + questões por aula + simulado + gabarito + histórico |
| Fase 2 | Filtros avançados, marcar questões para revisão, progresso persistido por usuário |
| Fase 3 | Múltiplas matérias, conteúdo no Firestore, permissões por usuário |

---

## Fora do escopo no MVP

- Cadastro manual (só login Google)
- Upload de PDFs pelo usuário
- Modo administrador para gerenciar conteúdo pela interface
