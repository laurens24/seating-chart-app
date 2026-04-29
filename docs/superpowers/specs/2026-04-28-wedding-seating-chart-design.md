# Wedding Seating Chart App — Design Spec
_Date: 2026-04-28_

## Overview

A single-page React web app that helps couples create a seating chart for their wedding. Users can enter or import a guest list, annotate guests with tags and relationship notes, define social dynamics between guests, and either manually assign seats or use an auto-suggest engine. All data lives in the browser — no backend, no login required.

---

## Architecture

- **Type:** Client-side SPA (React)
- **Data persistence:** `localStorage` (auto-saved on every change, debounced 500ms)
- **Portability:** Full dataset exportable as JSON; re-importable on any device
- **Deployment:** Static site (Netlify, GitHub Pages, etc.)
- **Routing:** React Router, client-side only
- **No backend, no auth, no server calls**

---

## Data Model

### Guest
```ts
{
  id: string
  name: string
  tags: string[]         // e.g. ["bride's college friend", "groomsman"]
  notes: string          // freeform description
  tableId: string | null // assigned table, null if unassigned
}
```

### Relationship
```ts
{
  guestAId: string
  guestBId: string
  type: "together" | "apart"
  note: string           // optional reason, e.g. "they're fighting"
}
```

### Table
```ts
{
  id: string
  name: string           // e.g. "Table 1", "Head Table"
  capacity: number       // max seats
  position: { x: number, y: number } // floor plan position
  shape: "round" | "rectangular"
}
```

The full dataset — `{ guests, relationships, tables }` — is one JSON object. This is what is written to localStorage and exported/imported.

---

## UI Layout

**Split panel layout** with a persistent left panel and a right panel. A top bar spans the full width.

### Top Bar
- App title ("WeddingSeat" or similar)
- "Import" button
- "Export" button
- "New Chart" button (clears data after confirmation)

### Left Panel — Guest List
- Scrollable list of all guests
- Each guest row shows: name, tags as colored chips, conflict indicator (if involved in an "apart" relationship with a tablemate)
- Search/filter bar at the top
- "Add Guest" button at the bottom
- Clicking a guest opens an inline editor for: name, tags, notes, relationships (add/remove "together" or "apart" pairs)

### Right Panel — Chart Editor
Two tabs:

**Floor Plan tab**
- Canvas with draggable table shapes (circles for round, rectangles for rectangular)
- Tables can be repositioned freely
- Drop a guest from the left panel onto a table to assign (or reassign) them
- Click a table to highlight its assigned guests in the left panel
- "Add Table" button on the canvas; clicking an existing table opens an inline editor for name, capacity, and shape

**Table List tab**
- Each table as a row showing: name, shape, capacity, current guest count (e.g. "4/8"), list of assigned guests
- Warning icon on any table row where an "apart" conflict exists between two seated guests
- Inline conflict detail on hover/expand: "Bob and Kelly are marked apart"
- Each table row has a "Delete Table" action (unassigns all its guests)
- "Add Table" button at the bottom of the list
- "✨ Suggest Seating" button in the right panel header (active in both tabs)

**Guest assignment / unassignment**
- Drag a guest from the left panel onto a table (Floor Plan tab) to assign or reassign them
- In the Table List tab, each guest name within a table row has an "×" to unassign them back to the guest list
- Right-clicking a guest in the left panel also offers "Unassign" if they are currently assigned

---

## Auto-Suggest Engine

Runs entirely client-side. Triggered by the "✨ Suggest Seating" button.

### Constraints
- **Hard (never violated):** "apart" relationships — guests flagged as apart are never placed at the same table
- **Soft (best-effort):** "together" relationships — guests flagged as together are placed at the same table if capacity allows. Guests sharing tags are also treated as a soft together-preference.

### Algorithm
A greedy pass:
1. Group unassigned guests by shared tags
2. Resolve explicit "together" relationships — place those guests in the same group
3. Assign groups to tables respecting capacity
4. Fill remaining unassigned guests into available seats while checking "apart" constraints

Does not guarantee a globally optimal solution; greedy is fast and sufficient for wedding scale (up to ~300 guests).

### Output — Propose & Review
Results are shown as a diff of proposed moves before any changes are applied:
- List of moves: e.g. "Move Alice → Table 2 (with Zach, Kyle)"
- Two actions: **Apply All** or **Review Each** (step through moves one by one, accepting or skipping)
- Existing manual assignments are preserved unless the user explicitly accepts a move that changes them

---

## Import

Triggered by the "Import" button. Opens a file picker.

- **Plain text (`.txt`):** one name per line → each becomes a guest with no tags or notes
- **CSV (`.csv`):** expected columns: `name`, `tags` (comma-separated within the cell), `notes`. Unrecognized columns are ignored.
- Duplicate names show a warning toast; they are not silently added
- Malformed files show a descriptive error toast; no partial data is applied

---

## Export

- **JSON export:** full dataset (`guests`, `relationships`, `tables`) as a `.json` file — for re-importing later
- **Print / PDF export:** renders the Table List view as a printer-friendly page (via browser print dialog)

---

## Persistence

- Full dataset is written to `localStorage` on every state change (debounced 500ms)
- On app load: restore from localStorage if data exists, otherwise start empty
- "New Chart" clears localStorage after a confirmation prompt

---

## Validation & Error Handling

- Guest names must be non-empty; blank names are rejected inline
- Duplicate guest names show a warning (not a hard block — some weddings have two guests named "James")
- Table capacity must be a positive integer
- Import errors show a toast with a plain-language description; no partial state is applied
- "Apart" conflict warnings appear inline in the Table List view — they are informational, not blocking. The user can choose to ignore them.

---

## Out of Scope (v1)

- Multi-user / real-time collaboration
- Backend, authentication, or cloud sync
- Guest RSVP tracking or dietary restrictions
- Seating within a table (who sits next to whom at the same table)
- Mobile-optimized layout
