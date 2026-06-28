# Clientes — per-client monthly earnings for Done

**Date:** 2026-06-28
**Status:** Approved, building

## Summary

Let a freelancer mark any group as a **client** and give it a **monthly value**
(R$/mês), then see their combined monthly income on the Tudo overview. Done
already nudges people to file tasks under client-shaped groups (Glide, Julia,
Lojas Ricardo's…); this turns that organization into a sense of *what each
client is worth* — control over recurring revenue without a spreadsheet.

## Decisions (from brainstorming)

- **Group can be a client** — groups still organize tasks; flagging one as a
  client adds money to it. Non-client groups show no money.
- **One value you edit** — a single number per client, overwritten as it
  changes. No payment history.
- **Monthly amount** — the number is R$/mês (recurring), so the headline is
  combined monthly income.
- **Lives in the Tudo overview** — no new sidebar entry.

## Data & storage

New `~/FocusBar/clients.json`: a flat map of group name → monthly value in
reais, e.g. `{ "Glide": 1500, "Lojas Ricardo's": 2000 }`. A group **is a
client** iff it has an entry. Follows the one-file-per-concern convention of
`groups.json` / `achievements.json` / `focus.json` — non-breaking, unlike
reshaping the flat `name → color` `groups.json`.

- `store.ts`: `loadClients(): Promise<ClientMap>`, `saveClients(ClientMap)`.
- `ClientMap = Record<string, number>`.
- Kept in sync with group lifecycle: renaming a group renames its client key;
  deleting a group removes it (and the delete-undo restores it) — mirrors how
  group colors are already handled in `MainApp`.

## Setting it — the group editor

In `GroupEditor` (right-click a group → rename/recolor/delete), below the color
palette and above "Excluir grupo":

- An **"É cliente"** toggle. `isClient = name in clients`.
  - On → `onSetClient(name, 0)`, reveals the value field.
  - Off → `onSetClient(name, null)` (entry removed; value forgotten).
- An **`R$ [____] /mês`** number field, shown only when client. Editing parses
  the input and calls `onSetClient(name, value)`.

## Seeing it — the Tudo overview (`Dashboard`)

- **"Receita mensal" banner** above "Acesso rápido", shown when there's ≥1
  client: the combined `R$ X/mês` (`totalMonthly`) + a count ("4 clientes"),
  with a hand-drawn `MoneyGlyph` in the accent color (no emoji).
- Each **client** Quick-Access card gains a money line — `R$ 1.500 / mês` —
  under the task counts. Non-client cards unchanged.

## Pure logic + tests (`src/lib/clients.ts`, TDD)

- `formatBRL(n)` → `"R$ 1.500"` (Intl pt-BR/BRL, no cents, normal spaces).
- `totalMonthly(clients)` → sum of values.
- `clientCount(clients)` → number of clients.
- `MoneyGlyph` added to `glyphs.tsx`.

## Out of scope (YAGNI, v1)

Payment history, paid/pending status, per-task pricing, invoices, income goals,
multi-currency, expenses. Just: mark client → set monthly → see the total.
