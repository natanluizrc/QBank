# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

QBank is a static, client-side question bank for personal study. Content is extracted from PDF course materials by Claude and stored as JSON. Initially focused on Accounting (Contabilidade), with plans to expand to other subjects.

There is no build step, no package manager, and no backend — open `index.html` directly in a browser or serve with any static file server.

## Architecture

The app is entirely static: HTML + vanilla JS + CSS, with data in JSON files.

**Data flow:** PDF → Claude extracts content → JSON file in `data/` → `app.js` loads and renders it.

### Navigation structure

Four tab types in the main nav:
1. **Material tabs** — one per JSON file in `data/`, each with two sub-tabs (Teoria / Questões)
2. **Simulado** — exam simulation mode
3. **Revisão Geral** — all questions from all materials with filters
4. **Histórico** — past simulation results (persisted in localStorage)

### Material tabs (Questões sub-tab)

- Two display modes toggled by a button: **lista** (all questions with inline answers) and **foco** (one at a time, answer → immediate feedback → next)
- Progress (score, answered, bookmarked) is session-only — resets on page reload
- Question types: `multiple_choice` and `true_false`

### Simulado flow

1. User picks number of questions (10/20/30/40/50) and source (all materials or one specific)
2. Questions are randomly sampled from the chosen source
3. One question at a time: user answers → immediate gabarito (correct/wrong + commentary) → next
4. Chronometer counts up (no time limit, no auto-submit)
5. On finish: score screen + full gabarito + auto-save to localStorage history

### Persistence

- `data/*.json` — static content (questions + theory)
- `localStorage` — simulation history only (`qbank_history` key, array of `{date, source, score, total, timeSeconds}`)
- Session progress in material tabs: in-memory only, never written to localStorage

## Data files

Each JSON file in `data/` represents one study material (one tab). The schema is defined in `PRD.md`. Key fields:
- `slug` — tab identifier and filename (e.g., `data/contabilidade-basica.json`)
- `subject` — subject name (e.g., `"Contabilidade"`)
- `theory` — Markdown string rendered in the Teoria sub-tab
- `questions` — array with `id`, `type`, `statement`, `options` (for multiple_choice), `answer`, `commentary`

## Adding new content

When the user provides a PDF, extract and produce a new JSON file following the schema in `PRD.md`. Place it in `data/` and register it in the materials list in `app.js`. Do not modify existing JSON files unless correcting content errors.

## Coding conventions

- No frameworks, no npm, no transpilation — plain ES6+ in `js/app.js`
- CSS in `css/style.css` — no utility frameworks; clean minimalist design
- Markdown in `theory` fields rendered client-side (use `marked` via CDN if needed)
- All UI text in Portuguese (pt-BR)
- IDs within a JSON file must be unique but need not be globally unique across files
- Layout must be responsive (mobile + desktop)
