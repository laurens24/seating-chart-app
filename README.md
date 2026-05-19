# SeatingHelper

A drag-and-drop event seating planner. Build your guest list, define relationships, and let the app suggest and fix seat assignments — all in the browser with no account required.

**Live app:** https://laurens24.github.io/seating-chart-app/

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4) ![Vite](https://img.shields.io/badge/Vite-6-646CFF)

## Features

- **Guest list** — add, edit, tag, and search guests; bulk-select to apply tags, unassign, or delete
- **Relationships** — mark pairs as *together*, *apart*, or *plus-one*; conflict warnings surface automatically
- **Drag and drop** — drag guests onto tables on the floor plan, drag tags onto tables to fill seats by group
- **Import** — upload `.txt` or `.csv`, or paste names directly; `Alice & Bob` / `Alice and Bob` syntax creates plus-one pairs automatically; duplicate names prompt for rename before import
- **Suggest seating** — auto-assigns all unassigned guests respecting relationships; creates new tables if needed
- **Fix conflicts** — one click resolves all seating conflicts (apart violations and split plus-ones)
- **Export** — save your full chart as JSON or print the table list
- **Auto-save** — state persists to `localStorage`; no login needed

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/seating-chart-app/](http://localhost:5173/seating-chart-app/).

## Build & Preview

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

## Tech Stack

- [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Zustand](https://zustand-demo.pmnd.rs) for state management
- [dnd-kit](https://dndkit.com) for drag and drop
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Vite](https://vitejs.dev) + [Vitest](https://vitest.dev) for build and testing
