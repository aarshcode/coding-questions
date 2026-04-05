# 450 DSA Tracker

A static, browser-based tracker for curated DSA problem sheets. It helps you manage progress across multiple popular lists, save notes per problem, export or import your data, and optionally sync progress across devices with Firebase authentication.

## Features

- Track progress across multiple sheets:
  - 450 DSA
  - Blind 75
  - SDE Sheet
  - NeetCode 150
  - Grind 169
- Unified overview dashboard with cross-sheet progress stats
- Topic-based filtering and search
- Problem-level notes
- Local backup via JSON export/import
- Dark and light theme toggle
- Optional sign-in with Google or GitHub for realtime sync
- Cross-sheet progress propagation for matching problem URLs

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Firebase Auth + Realtime Database via CDN
- `localStorage` for primary client-side persistence

## Run Locally

This project does not use npm, a build tool, or a backend server for local usage.

1. Clone or download the repository.
2. Open [`index.html`](/Users/aarsh/Projects/450dsa/index.html) in your browser.

That is enough to use the app locally.

## How Data Is Stored

- Progress is stored in `localStorage` under the `dsa_v4_*` key namespace.
- Notes are stored separately from sheet progress.
- Export creates a `dsa-progress.json` backup file.
- Import validates the JSON structure before restoring data.
- If you sign in, local progress and notes can be synced to Firebase Realtime Database.

## Project Structure

- [`index.html`](/Users/aarsh/Projects/450dsa/index.html): App shell and script/style loading
- [`styles/main.css`](/Users/aarsh/Projects/450dsa/styles/main.css): Complete UI styling
- [`scripts/app.js`](/Users/aarsh/Projects/450dsa/scripts/app.js): Main UI state, rendering, filters, theme, notes, import/export
- [`scripts/firebase-sync.js`](/Users/aarsh/Projects/450dsa/scripts/firebase-sync.js): Authentication and realtime sync logic
- [`scripts/datasets.js`](/Users/aarsh/Projects/450dsa/scripts/datasets.js): Embedded datasets for all supported sheets
- [`scripts/constants.js`](/Users/aarsh/Projects/450dsa/scripts/constants.js): Storage keys and topic icon maps
- [`data.json`](/Users/aarsh/Projects/450dsa/data.json): Original source dataset for the 450 DSA list
- [`CLAUDE.md`](/Users/aarsh/Projects/450dsa/CLAUDE.md): Repository notes and architecture guidance

## Supported Dataset Shape

Each problem entry follows this shape:

```json
{
  "topic": "Array",
  "problem": "Reverse the array",
  "url": "https://example.com/problem"
}
```

## Import / Export Format

The exported backup is a JSON object that may contain sheet keys and notes:

```json
{
  "dsa450": {
    "Reverse the array": true
  },
  "blind75": {
    "Two Sum": true
  },
  "notes": {
    "Two Sum": "Use a hash map for O(n)."
  }
}
```

## Firebase Sync

Firebase is already wired into the app through CDN scripts and a configured project in [`scripts/firebase-sync.js`](/Users/aarsh/Projects/450dsa/scripts/firebase-sync.js).

- Sign in with Google or GitHub
- Progress and notes are synced per user
- Local usage still works without signing in

If you plan to publish or fork this project, review the Firebase configuration and security rules before deploying.

## Notes for Contributors

- Keep the app framework-free unless there is a strong reason to change that
- Avoid introducing a build pipeline for simple UI changes
- Escape user-controlled text before inserting it into `innerHTML`
- Keep `data.json` and the embedded datasets aligned when updating problem content

## License

No license file is currently included in this repository. Add one if you want to define reuse terms explicitly.
