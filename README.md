# GitRoast (Angular + NestJS)

GitRoast has been migrated from Next.js to:

- Angular 20 frontend (`apps/web`)
- NestJS backend on Node.js (`apps/api`)

The backend exposes `POST /api/roast` and keeps the GitHub analysis + Groq roast generation flow.

## Tech Stack

- Frontend: Angular 20 (standalone components)
- Backend: NestJS 11 (Node.js)
- AI: Groq (`llama-3.1-8b-instant`)
- Data source: GitHub REST API

## Project Layout

- `apps/web`: Angular app
- `apps/api`: NestJS API
- `src`: legacy Next.js code (kept as reference during migration)

## Environment Variables

Set these for the backend (`apps/api`):

- `GROQ_API_KEY` (required)
- `GITHUB_TOKEN` (optional, improves rate limits)
- `PORT` (optional, default `3000`)
- `WEB_ORIGIN` (optional, default `http://localhost:4200`)

## Run Locally

Install root helper dependency:

```bash
npm install
```

Start both frontend and backend:

```bash
npm run dev
```

Or run individually:

```bash
npm run dev:api
npm run dev:web
```

Frontend URL: `http://localhost:4200`

Backend URL: `http://localhost:3000`
