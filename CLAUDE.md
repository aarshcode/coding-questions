# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **450 DSA Problem Tracker** — a static web app for tracking progress through curated DSA problem lists. No build system, no npm, no server.

**To run:** Open `index.html` directly in a browser.

## File Structure

- `index.html` — Thin entrypoint that loads the extracted assets
- `styles/main.css` — App styles
- `scripts/constants.js` — Storage keys and icon maps
- `scripts/datasets.js` — Embedded problem-set arrays for all supported sheets
- `scripts/firebase-sync.js` — Firebase auth + realtime sync glue
- `scripts/app.js` — Main UI state, rendering, filters, notes, import/export, and theme logic
- `data.json` — Original 448-item 450 DSA source data (`topic`, `problem`, `url`)
- `rebuild.py` — Utility/recovery script; not part of runtime

## Architecture

The app is still framework-free and browser-only, but it is now split by concern:

- `index.html` contains the static markup shell.
- `styles/main.css` contains the extracted styling.
- `scripts/datasets.js` contains the in-browser datasets for the different sheets.
- `scripts/firebase-sync.js` handles auth state and sync.
- `scripts/app.js` owns the UI state and rendering.

### State (global JS variables)
- `progress` — localStorage-backed object keyed by problem name; values are booleans
- `mode` — `'dsa450'` or `'b75'` (which problem set is active)
- `topic` — currently selected topic string, or `null` for overview
- `filter` — `'all'` | `'todo'` | `'done'`
- `diffF` — difficulty filter: `'Easy'` | `'Medium'` | `'Hard'` | `'all'`
- `tsearch` / `gsearch` — topic-scoped and global search strings
- `shown` — pagination counter (increments by 20)

localStorage key prefix: `dsa_v4_dsa450`

### Rendering pipeline
`renderMain()` → dispatches to `renderOverview()` (topic=null) or `renderTable()` (topic selected) or search results view. `renderSb()` renders the sidebar independently. Neither uses a virtual DOM — they write directly to `innerHTML`.

### Key functions
| Function | Role |
|---|---|
| `init()` | Bootstrap: load theme + progress from localStorage, call render |
| `renderSb()` | Sidebar with per-topic progress bars |
| `renderMain()` | Top-level dispatcher for the main content area |
| `renderTable()` | Problem table with pagination |
| `renderOverview()` | Dashboard with progress rings and topic cards |
| `applyFilters()` | Returns filtered subset of the active problem list |
| `toggle(idx)` | Flip solved state for a problem, persist, re-render |
| `patchSb(t)` | Incremental sidebar update (avoids full re-render) |
| `esc(s)` | HTML-escape user input — use this for any dynamic string inserted into innerHTML |

### Data shape (`data.json` / embedded arrays)
```json
{ "topic": "Array", "problem": "Reverse the array", "url": "https://..." }
```
The `DSA450[]` array in `scripts/datasets.js` mirrors `data.json`; keep them in sync if modifying problems.

### Theming
Dark mode is default. Light mode toggled via a button and stored in localStorage. Implemented with CSS custom properties (`--bg`, `--surface`, `--text`, etc.) swapped by adding a `light` class to `<body>`.

## Important Constraints

- **No XSS**: Any user-controlled string rendered into innerHTML must go through `esc()`.
- **No external dependencies**: Do not introduce npm packages or a build pipeline. Firebase CDN scripts and Google Fonts are already part of the app.
- **localStorage only**: There is no backend; all persistence is client-side.
