# Survey Studio

**Survey Studio** is a full-stack survey application built with **Next.js 15** (App Router), **React 19**, **TypeScript**, **Tailwind CSS**, and **MongoDB** (via **Mongoose**). You can create surveys, define questions with several answer types, collect responses, and view per-question analytics.

This document is written for **human contributors** and **AI coding assistants** so features, contracts, and extension points stay explicit and easy to build on.

---

## Table of contents

1. [Quick start](#quick-start)
2. [Feature inventory](#feature-inventory)
3. [Tech stack](#tech-stack)
4. [Project layout](#project-layout)
5. [Environment variables](#environment-variables)
6. [Data models](#data-models)
7. [HTTP API reference](#http-api-reference)
8. [User-facing routes](#user-facing-routes)
9. [Important behaviors & validation](#important-behaviors--validation)
10. [Database connection (serverless-friendly)](#database-connection-serverless-friendly)
11. [Scripts](#scripts)
12. [Security & limitations](#security--limitations)
13. [Extension guide (for AI and developers)](#extension-guide-for-ai-and-developers)

---

## Quick start

```bash
cd survey-app
cp .env.local.example .env.local
# Edit .env.local and set MONGODB_URI (local MongoDB or Atlas)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Ensure MongoDB is reachable before using survey features.

**Production build:**

```bash
npm run build
npm start
```

---

## Feature inventory

Use this checklist when planning changes or when an AI agent needs a concise capability map.

| Area | Feature | Status | Notes |
|------|---------|--------|--------|
| Surveys | Create survey (title, description) | ✅ | `/surveys/new` → redirects to editor |
| Surveys | List all surveys on home | ✅ | Sorted by `updatedAt` descending |
| Surveys | Edit title & description | ✅ | Survey builder |
| Surveys | Delete survey | ✅ | Also deletes all responses for that survey |
| Questions | Single choice (radio) | ✅ | Options stored on survey |
| Questions | Multiple choice (checkboxes) | ✅ | Answer value is `string[]` |
| Questions | Short text (textarea) | ✅ | No options; `options` array empty |
| Questions | Required / optional toggle | ✅ | Server enforces required answers on submit |
| Questions | Add / remove questions | ✅ | Client generates stable `id` (UUID) per question |
| Questions | Add / remove choice options | ✅ | Empty strings stripped on save |
| Responses | Public submit form | ✅ | `/surveys/[id]` |
| Responses | Validate answers against survey schema | ✅ | See [validation](#important-behaviors--validation) |
| Analytics | Total response count | ✅ | `/surveys/[id]/results` |
| Analytics | Last submission timestamp | ✅ | From latest `SurveyResponse.createdAt` |
| Analytics | Choice questions: counts + bar chart | ✅ | Percentages relative to total responses |
| Analytics | Text questions: sample list (up to 50) | ✅ | Not a full text search index |
| API | REST-style JSON routes under `/api` | ✅ | No GraphQL |
| Auth | User accounts / login | ❌ | Not implemented; all routes are open |
| Export | CSV / PDF export | ❌ | Good extension candidate |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, `app/`) |
| UI | React 19, Tailwind CSS 3 |
| Language | TypeScript (strict) |
| Database | MongoDB |
| ODM | Mongoose 8 |
| Fonts | `next/font` (Geist Sans / Mono) |

---

## Project layout

Only **source** and **config** paths are listed (omit `node_modules`, `.next`).

```
survey-app/
├── README.md                 # This file
├── package.json
├── tsconfig.json
├── next.config.ts
├── next-env.d.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.local.example        # Template for secrets
├── .gitignore
├── app/
│   ├── globals.css           # Theme variables + Tailwind layers
│   ├── layout.tsx            # Shell: header, nav, fonts
│   ├── page.tsx              # Home: survey list (server component)
│   ├── surveys/
│   │   ├── new/page.tsx      # Create survey (client)
│   │   └── [id]/
│   │       ├── page.tsx      # Take survey (client form)
│   │       ├── edit/page.tsx # Builder wrapper
│   │       └── results/page.tsx
│   └── api/
│       └── surveys/
│           ├── route.ts                    # GET list, POST create
│           └── [id]/
│               ├── route.ts                # GET, PATCH, DELETE one survey
│               ├── responses/route.ts      # POST submit, GET list responses
│               └── analytics/route.ts      # GET aggregated analytics
├── components/
│   ├── SurveyBuilder.tsx     # Editor UI + save/delete
│   ├── TakeSurveyForm.tsx  # Public response form
│   └── AnalyticsDashboard.tsx
├── lib/
│   └── db.ts                 # Mongoose connect (cached for serverless)
├── models/
│   ├── Survey.ts             # `Survey` model + `ISurvey` types
│   └── Response.ts           # `SurveyResponse` model + `IResponse` types
└── types/
    └── survey.ts             # Shared `QuestionType`, `SurveyQuestion`, etc.
```

**Conventions:**

- `@/*` path alias maps to the project root (see `tsconfig.json`).
- **Server** data loading: `app/page.tsx` uses `connectDB()` + Mongoose directly.
- **Client** interactive pages use `fetch()` to `/api/...`.
- **API routes** live only under `app/api/**/route.ts` (Next.js Route Handlers).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | **Yes** (for any DB feature) | Full MongoDB connection string. Example: `mongodb://127.0.0.1:27017/survey-app` or Atlas URI with credentials. |

Copy `.env.local.example` to `.env.local` and set values there. `.env.local` is gitignored.

If `MONGODB_URI` is missing at **runtime** when a route calls `connectDB()`, the app throws a clear error (see `lib/db.ts`).

---

## Data models

### Collection: `surveys` (Mongoose model name: `Survey`)

Logical shape (aligned with `ISurvey` in `models/Survey.ts`):

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB id; exposed to clients as string in JSON |
| `title` | string | Required, trimmed |
| `description` | string | Optional, default `""` |
| `questions` | array | See **Question** below |
| `createdAt` | Date | From `timestamps` |
| `updatedAt` | Date | From `timestamps` |

**Question** (`ISurveyQuestion` / `SurveyQuestion`):

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable client-generated id (UUID); used to match answers |
| `text` | string | Question label |
| `type` | `"single"` \| `"multiple"` \| `"text"` | Answer control type |
| `options` | string[] | For `single` / `multiple`: answer choices. For `text`: typically `[]` |
| `required` | boolean | Default `true` in schema |

### Collection: `surveyresponses` (Mongoose model: `SurveyResponse`)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Response id |
| `surveyId` | ObjectId | Reference to survey; indexed |
| `answers` | array of `{ questionId, value }` | `value` is `string` (single/text) or `string[]` (multiple) |
| `createdAt` | Date | Submission time (`updatedAt` disabled on schema) |

Shared TypeScript types for the frontend live in `types/survey.ts`. Mongoose document types live in `models/*.ts`.

---

## HTTP API reference

Base URL is the app origin (e.g. `http://localhost:3000`). All bodies are **JSON** unless noted.

### `GET /api/surveys`

Returns an array of surveys (full documents including `questions`), newest `updatedAt` first.

**Error:** `500` — DB or server failure.

---

### `POST /api/surveys`

Creates a survey.

**Body:**

```json
{
  "title": "string (required, non-empty after trim)",
  "description": "string (optional)",
  "questions": []
}
```

`questions` may be omitted or an array; typically empty on first create, then filled via `PATCH`.

**Success:** `200` — created survey JSON with `_id` as string.

**Error:** `400` — missing title; `500` — server error.

---

### `GET /api/surveys/[id]`

**Params:** `id` — MongoDB ObjectId string.

**Success:** `200` — survey document; `_id` serialized as string.

**Errors:** `400` invalid id; `404` not found; `500` server error.

---

### `PATCH /api/surveys/[id]`

Updates a survey. Partial updates supported for known fields.

**Body (all optional except you must keep title valid if sent):**

```json
{
  "title": "string",
  "description": "string",
  "questions": [ /* full question objects */ ]
}
```

**Success:** `200` — updated survey.

**Errors:** `400` invalid id or empty title after update; `404`; `500`.

---

### `DELETE /api/surveys/[id]`

Deletes the survey and **all** its `SurveyResponse` documents.

**Success:** `200` — `{ "ok": true }`.

**Errors:** `400`; `404`; `500`.

---

### `POST /api/surveys/[id]/responses`

Submits one completed survey response.

**Body:**

```json
{
  "answers": [
    { "questionId": "<question id>", "value": "string or string[]" }
  ]
}
```

**Success:** `200` — `{ "ok": true, "id": "<response _id>" }`.

**Errors:**

- `400` — invalid `id`, malformed body, unknown `questionId`, invalid option for choice questions, missing required answer, wrong `value` type for question type.
- `404` — survey not found.
- `500` — server error.

---

### `GET /api/surveys/[id]/responses`

Returns all responses for the survey, newest first. Each item includes stringified `_id` and `surveyId`.

**Errors:** `400`, `500`.

---

### `GET /api/surveys/[id]/analytics`

Returns aggregated analytics (no raw full export in UI; data is derived in memory on the server).

**Success shape (conceptual):**

```json
{
  "surveyId": "string",
  "title": "string",
  "totalResponses": 0,
  "lastSubmittedAt": "ISO date | null",
  "byQuestion": [
    {
      "questionId": "string",
      "text": "string",
      "type": "single | multiple | text",
      "options": ["..."],
      "counts": { "optionLabel": 0 },
      "textSamples": ["..."]
    }
  ]
}
```

- For **text** questions, `textSamples` holds up to **50** recent non-empty answers; `counts` may still be present but UI focuses on samples.
- For **choice** questions, `counts` is used for bars; percentages in UI use `totalResponses` as denominator.

**Errors:** `400`, `404`, `500`.

---

## User-facing routes

| Path | Component / behavior |
|------|----------------------|
| `/` | Lists surveys; shows DB connection error if `MONGODB_URI` fails |
| `/surveys/new` | Create survey then redirect to `/surveys/[id]/edit` |
| `/surveys/[id]/edit` | `SurveyBuilder`: edit metadata, questions, save, delete |
| `/surveys/[id]` | `TakeSurveyForm`: public submission |
| `/surveys/[id]/results` | `AnalyticsDashboard`: charts and text samples |

Global chrome (title, nav) is in `app/layout.tsx`.

---

## Important behaviors & validation

When implementing new features, respect these rules so responses stay consistent.

1. **Question identity:** Answers are keyed by `questionId` matching `questions[].id`. Never reuse ids across different logical questions without migrating responses.

2. **Required questions:** On `POST .../responses`, every question with `required: true` must have a non-empty answer:
   - `text` / `single`: non-empty string after considering “empty” checks in code.
   - `multiple`: at least one selected option (empty array is rejected for required).

3. **Choice validation:** Selected values must appear in that question’s `options` array (after server-side trim on save for survey definitions).

4. **Optional questions:** If not required and empty, the answer may be omitted from the normalized payload stored in MongoDB.

5. **Strip options on save:** The builder sends `questions` with `options` cleared for `type === "text"` and trims/filters empty option strings for choice types.

6. **Delete cascade:** Deleting a survey removes dependent responses in the same `DELETE` handler.

---

## Database connection (serverless-friendly)

`lib/db.ts` uses a **global singleton** pattern to reuse the Mongoose connection across hot invocations in serverless environments (e.g. Vercel). Always call `connectDB()` at the start of API routes or server code that touches the database.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint (Next core-web-vitals) |

---

## Security & limitations

- **No authentication or authorization.** Anyone who can reach the deployment can create surveys, submit fake data, read analytics, and delete surveys if they guess or obtain URLs.
- **No rate limiting** on submissions.
- **No CSRF tokens** for same-site fetches; typical for same-origin SPA-style usage but reconsider for cross-site embedding.
- **GET `/api/surveys/[id]/responses`** exposes raw responses; treat as sensitive if deployed publicly.

For production hardening, add auth (e.g. NextAuth), role-based access (admin vs respondent), rate limits, and consider making raw response listing admin-only.

---

## Extension guide (for AI and developers)

When extending this codebase, prefer the following patterns.

### Adding a new question type

1. Extend `QuestionType` in `types/survey.ts` and the Mongoose `enum` in `models/Survey.ts`.
2. Update `components/SurveyBuilder.tsx` (editor UI + option handling).
3. Update `components/TakeSurveyForm.tsx` (input UI + local state shape).
4. Update `POST` handler in `app/api/surveys/[id]/responses/route.ts` (normalize and validate `value`).
5. Update `app/api/surveys/[id]/analytics/route.ts` (aggregation / display logic) and `components/AnalyticsDashboard.tsx`.

### Adding authentication

- Introduce session or JWT verification middleware / helpers.
- Protect `PATCH`, `DELETE`, `GET` list, builder, and results routes as needed.
- Keep public `POST .../responses` for anonymous respondents **only if** product requirements allow; otherwise issue one-time tokens or signed links.

### Adding CSV export

- Add a route e.g. `GET /api/surveys/[id]/export.csv` that loads responses and streams CSV; or a server action from an admin-only page.

### Renaming models or collections

Mongoose uses pluralized lowercase collection names by default (`surveys`, `surveyresponses`). Renaming requires migration scripts and updating `model()` definitions.

### Testing suggestions

- Unit-test validation in `responses/route.ts` with mocked `Survey` documents.
- Integration tests against a real MongoDB (e.g. Docker) for create → submit → analytics flow.

---

## License

Private project (`"private": true` in `package.json`). Add a SPDX license identifier here if you open-source the repo.
