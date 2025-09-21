# Repository Guidelines

## Project Structure & Module Organization
- Next.js app routes live in `src/app`; each feature folder (`objectives`, `quiz`, `practice`, `insights`, `api`) owns its page component and local UI.
- Shared utilities and data helpers are in `src/lib`; extend this folder instead of duplicating logic inside route trees.
- Prisma schema and migrations sit under `prisma/`; the generated SQLite db (`prisma/dev.db`) should only be updated through migrations or `db:push`.
- Static assets belong in `public/`, and global Tailwind styles are maintained at `src/app/globals.css`.

## Build, Test, and Development Commands
- `npm run dev` starts the Next.js dev server with Turbopack hot reload.
- `npm run build` compiles the production bundle and fails on type or lint errors.
- `npm run start` serves the built output; use it for smoke tests before deploying.
- `npm run lint` runs ESLint via `eslint.config.mjs`; append `-- --fix` to autofix style issues.
- `npm run typecheck` executes `tsc --noEmit` for strict typing.
- `npm run db:push`, `npm run db:migrate`, and `npm run db:studio` manage the Prisma schema and console; run them whenever modifying `schema.prisma`.

## Coding Style & Naming Conventions
- Code is TypeScript + React 19; prefer functional components and keep server/client boundaries explicit (`"use client"` only when necessary).
- Respect ESLint rules and the default 2-space indentation; rely on Prettier-compatible formatting and trailing commas for multi-line literals.
- Components, hooks, and types use PascalCase; functions, constants, and file names stay camelCase/kebab-case; environment variables follow upper snake case (`QUIZAI_*`).
- Co-locate feature-specific hooks/components inside their route folder to keep imports flat and tree-shakable.

## Testing Guidelines
- Automated UI tests are not yet configured; treat `npm run lint`, `npm run typecheck`, and a local `npm run build` as mandatory pre-commit gates.
- When introducing test tooling, place specs beside the module as `*.test.ts(x)` and document the new command in `package.json`.
- Manually verify critical flows (create objectives, generate quiz, review insights) before opening a PR.

## Commit & Pull Request Guidelines
- Target the `main` branch; write commit messages in imperative mood with a brief scope (`feat: add quiz review summary`).
- PR descriptions should explain intent, summarize changes, and list validation steps; attach screenshots or recordings for UI updates.
- Highlight schema updates, new env vars, and data migrations in the PR checklist so reviewers can coordinate database changes.
