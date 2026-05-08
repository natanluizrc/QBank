# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

QBank is a static, client-side question bank for personal study. Content is extracted from PDF course materials by Claude and stored as JSON. Initially focused on Accounting (Contabilidade), with plans to expand to other subjects.

There is no build step, no package manager, and no backend — open `index.html` directly in a browser or serve with any static file server.

## Architecture

The app is entirely static: HTML + vanilla JS + CSS, with data in JSON files.

**Data flow:** PDF → Claude extracts content → JSON file in `data/` → `app.js` loads and renders it.

Each JSON file in `data/` represents one study material (one tab in the UI). The schema is defined in `PRD.md`. Key fields:
- `slug` — used as the tab identifier and filename (e.g., `data/contabilidade-basica.json`)
- `theory` — Markdown string rendered in the Theory sub-tab
- `questions` — array of questions, each with `type` (`multiple_choice` or `true_false`), `options`, `answer`, and `commentary`

**Navigation model:** top-level tabs (one per JSON file) → two sub-tabs each: **Teoria** and **Questões**.

## Adding new content

When the user provides a PDF, extract and produce a new JSON file following the schema in `PRD.md`. Place it in `data/` and register it in the tab list in `app.js`. Do not modify existing JSON files unless correcting errors in previously extracted content.

## Coding conventions

- No frameworks, no npm, no transpilation — plain ES6+ in a single `js/app.js`
- CSS in `css/style.css` — no utility frameworks
- Markdown in `theory` fields is rendered client-side (use a minimal renderer or a small lib like `marked` via CDN if needed)
- IDs within a JSON file must be unique but need not be globally unique across files
