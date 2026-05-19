# Wedding Seating Chart

A drag-and-drop wedding seating chart app. Manage your guest list, define relationships, and let the app suggest optimal table assignments — all in the browser with no backend required.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4) ![Vite](https://img.shields.io/badge/Vite-6-646CFF)

## Features

- **Guest list** — add, edit, tag, and search guests; bulk-select for tag application or deletion
- **Relationships** — mark guests as *together*, *apart*, or *plus-one*; conflict warnings appear automatically
- **Drag and drop** — drag guests onto tables on the floor plan, or drag tags directly onto tables
- **Suggest seating** — auto-assign unassigned guests to tables respecting relationships; generates new tables if needed
- **Import guests** — upload a `.txt` or `.csv` file, or paste names directly; supports `Alice & Bob` / `Alice and Bob` syntax to auto-create plus-one pairs
- **Export** — print or export the table list
- **Persistent state** — everything is saved to `localStorage`; no account needed

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

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
