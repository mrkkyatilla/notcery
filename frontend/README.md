# Notcery Frontend

React 19 + Vite + TypeScript client. API contract: [`../docs/openapi.yml`](../docs/openapi.yml).

## Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run api:types` | Regenerate `src/shared/api/schema.d.ts` from OpenAPI |
| `npm run api:types:check` | Fail if OpenAPI drift vs committed types |
| `npm run i18n:check` | Fail if `tr`/`en` locale keys differ |
| `npm run e2e` | Playwright (build with MSW via `--mode e2e`) |
| `npm run test:coverage` | Vitest with coverage gate on `shared/` + `auth/` |

## MSW (optional)

Set `VITE_ENABLE_MSW=true` in `.env` to mock `/health` and `/config/public` without the backend.

## Phase status

- **F0**: router, Tailwind/shadcn base, API client, i18n/theme skeleton, CI
- **F1**: auth, i18n/errors, workspace, onboarding, settings
- **F2**: FullCalendar planner, event CRUD, plan save/activate
- **F3**: TipTap notes, split view, chat skeleton
- **F4**: document library, upload, indexing status
- **F5**: AI plan generation, RAG chat, citations
- **F6**: tests, E2E, code split, Sentry — [`../docs/frontend-fazlar/faz-6-kalite.md`](../docs/frontend-fazlar/faz-6-kalite.md)
- **F7**: billing, landing, waitlist, feedback — [`../docs/frontend-fazlar/faz-7-saas-ui.md`](../docs/frontend-fazlar/faz-7-saas-ui.md)

Durum özeti: [`../docs/frontend-fazlar/DURUM.md`](../docs/frontend-fazlar/DURUM.md) · Prod deploy: [`../notes/deploy/README.md`](../notes/deploy/README.md)

## Routes (F1)

| Path | Description |
|------|-------------|
| `/login`, `/register` | Guest auth |
| `/onboarding` | First-time setup |
| `/dashboard` | Workspace home |
| `/planner` | Weekly/daily calendar, events |
| `/w/:workspaceId/notes` | Notes list + editor + chat skeleton |
| `/w/:workspaceId/notes/:noteId` | Open note (autosave) |
| `/w/:workspaceId/library` | Document upload & indexing |
| `/settings/profile` | Profile, locale, theme |
| `/settings/billing` | Subscription, usage, upgrade |
| `/settings/account` | Export data, delete account |
| `/` (guest) | Landing + waitlist |
