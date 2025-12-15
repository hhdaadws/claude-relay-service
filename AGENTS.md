# Repository Guidelines

## Project Structure

- `src/`: Node.js/Express API service (`routes/`, `services/`, `middleware/`, `models/`); entrypoint is `src/app.js`.
- `cli/`: management CLI (run via `npm run cli …`).
- `web/admin-spa/`: Vue 3 + Vite admin UI; build output goes to `web/admin-spa/dist/`.
- `tests/`: Jest tests (unit + integration).
- `scripts/`: ops/migrations and service manager (`scripts/manage.js`).
- `config/`: runtime config (`config/config.example.js` → `config/config.js`).
- `data/`, `logs/`, `temp/`: runtime state (gitignored).

## Build, Test, and Development Commands

- `npm install` (or `npm ci`): install backend dependencies.
- `npm run setup` (or `make setup`): create local `.env` and `config/config.js`; generates initial admin credentials in `data/init.json`.
- `npm run dev`: run backend with hot reload (nodemon).
- `npm start`: run backend (includes a lint pass first).
- `npm test`: run Jest (`tests/`).
- Admin UI: `cd web/admin-spa && npm ci && npm run dev` (or `npm run install:web` / `npm run build:web` from repo root).
- Docker: `docker-compose up -d` (or `make docker-up`).

## Coding Style & Naming Conventions

- Backend uses ESLint + Prettier; prefer running `npm run format` then `npm run lint`.
- Prettier defaults: 2 spaces, single quotes, no semicolons, `printWidth: 100`.
- Prefix intentionally unused variables with `_` to satisfy lint rules.
- Frontend has its own lint/format config in `web/admin-spa/`.

## Testing Guidelines

- Use Jest; name tests `*.test.js` (integration tests may use `*.integration.test.js`).
- For new/changed HTTP endpoints, add coverage using `supertest` patterns in `tests/`.
- Optional: `npm test -- --coverage` (or `make test-coverage`).

## Commit & Pull Request Guidelines

- Follow Conventional Commits seen in history and CI docs: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `refactor:`, `perf:`.
- Use `[skip ci]` only for changes that should not trigger automation (typically docs-only).
- PRs should include: summary, test plan, any config/env changes, and screenshots for `web/admin-spa/` UI updates. Ensure both `npm run format`/`npm run lint` and `cd web/admin-spa && npm run format`/`npm run lint` pass.

## Security & Configuration

- Do not commit secrets or local state: `.env`, `config/config.js`, and `data/` are intentionally gitignored—base changes on `.env.example` and `config/config.example.js`.
