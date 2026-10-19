# Noted

A minimal, Anki-style learning app. Create flashcards with images and Mermaid
diagrams, link related cards together, and review them with spaced repetition.

- **Frontend** — React + Vite + Tailwind (mobile-first, siteinspire "minimal websites" style)
- **Backend** — Node.js + TypeScript + Express + Prisma
- **Database** — MySQL
- **Deployment** — Docker Compose

## Features

| Requirement | How it's implemented |
| --- | --- |
| Anki-style learning | Review queue with flip cards and `Again / Hard / Good / Easy` scheduling (simplified SM-2) |
| Image per card | Upload images via `POST /api/images`; attach with `imageId`. Stored on the backend. |
| Swappable storage | `ImageStorage` interface with a `local` driver now and an `oss` stub ready to implement |
| Card relationships | `POST /api/relations` links two cards and may reference a third card that *describes* the relation |
| Data to MySQL | Prisma models `User`, `Card`, `Image`, `CardRelation` |
| Passwordless identity | Enter a unique username once → get a `uuid`. Stored client-side; sent as `X-User-Id`. |
| Mermaid diagrams | Paste Mermaid text on a card; rendered client-side with mermaid.js |
| English default | All UI copy is English |

## Run with Docker Compose

```bash
cp .env.example .env   # optional — defaults work out of the box
docker compose up --build
```

Then open <http://localhost:8080>. Services:

- Frontend (nginx): `http://localhost:8080`
- Backend API: `http://localhost:3000`
- MySQL: `localhost:3306`

## Local development

```bash
# Backend (http://localhost:3000)
cd backend
npm install
npx prisma generate
# point DATABASE_URL at a running MySQL, then:
npx prisma migrate deploy
npm run dev

# Frontend (http://localhost:5173, proxies /api → :3000)
cd frontend
npm install
npm run dev
```

## Environment variables

See [`.env.example`](.env.example). The key one is `DATABASE_URL`
(`mysql://user:pass@host:3306/noted`).

## Image storage & OSS

The backend talks only to the `ImageStorage` interface
(`backend/src/storage/driver.ts`):

- `save(key, data, contentType) → public URL | null`
- `read(key) → Buffer`
- `remove(key)`

The **local** driver writes files under `UPLOAD_DIR` (a Docker volume) and serves
them through `GET /api/images/:id`. To move to object storage later, implement
the three methods in `backend/src/storage/oss.ts` with your OSS/S3 SDK, then set
`STORAGE_DRIVER=oss` plus the `OSS_*` variables. `save` should return the
object's public URL so clients render images directly.

## Batch import (JSON / CSV)

The **Cards** screen has an **Import** button that accepts `.json` or `.csv`
files (with downloadable samples). Both formats support the same fields:
`front` (required), `back` (required), `mermaid` (optional).

**JSON** — an array of objects, or an object with a `cards` array:

```json
[
  { "front": "Capital of France?", "back": "Paris" },
  { "front": "Photosynthesis", "back": "6CO2 + 6H2O -> C6H12O6 + 6O2", "mermaid": "graph TD; A-->B" }
]
```

**CSV** — first row is the header; quote fields that contain commas or newlines:

```csv
front,back,mermaid
"Capital of France?","Paris",
"Photosynthesis","6CO2 + 6H2O -> C6H12O6 + 6O2","graph TD; A-->B"
```

Sample files ship with the app and are linked from the import panel:
[`frontend/public/samples/cards.json`](frontend/public/samples/cards.json) and
[`frontend/public/samples/cards.csv`](frontend/public/samples/cards.csv).

## API overview

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/users` | Create (or fetch) a user by unique username |
| `GET` | `/api/users/me` | Current user (via `X-User-Id`) |
| `GET` | `/api/cards` | List cards (`?q=` search) |
| `GET` | `/api/cards/review` | Cards due now |
| `POST` | `/api/cards` | Create a card |
| `POST` | `/api/cards/import` | Bulk-import cards (`{ "cards": [...] }`) |
| `GET/PUT/DELETE` | `/api/cards/:id` | Read / update / delete a card |
| `POST` | `/api/cards/:id/review` | Grade a card (`again/hard/good/easy`) |
| `POST` | `/api/images` | Upload an image (multipart `file`) |
| `GET/DELETE` | `/api/images/:id` | Stream / delete an image |
| `GET/POST` | `/api/relations` | List / create relations |
| `DELETE` | `/api/relations/:id` | Delete a relation |

Authenticated routes expect the `X-User-Id` header.

## Project structure

```
backend/
  prisma/schema.prisma       # data model
  src/
    routes/                  # users, cards, images, relations
    storage/                 # ImageStorage interface + local/oss drivers
    middleware/auth.ts       # X-User-Id middleware
    scheduler.ts             # simplified SM-2
frontend/
  src/
    api.ts                   # typed API client
    components/              # ReviewSession, CardEditor, RelationEditor, Mermaid…
    pages/                   # Welcome, Cards
    App.tsx                  # shell + navigation
docker-compose.yml
```
