# InternHub — Backend

Node.js + Express + Prisma REST API.

## Setup

```bash
cd backend
npm install

# Copy and fill in env vars
cp .env.example .env

# Run DB migrations (requires DATABASE_URL in .env pointing to Neon/Postgres)
npm run db:generate
npm run db:migrate

# Seed with dummy data
npm run db:seed

# Start dev server (hot-reload)
npm run dev
```

## Environment Variables

| Variable       | Description                                    |
|---------------|------------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon format)     |
| `JWT_SECRET`   | Long random string for signing JWTs            |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`)              |
| `PORT`         | Server port (default `5000`)                   |
| `CORS_ORIGIN`  | Frontend origin for CORS (default `http://localhost:3000`) |

## Endpoints

```
GET    /health

POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me           (JWT required)

GET    /api/internships       ?search=&location=&source=&page=&limit=
GET    /api/internships/:id

POST   /api/tracker           (JWT required) body: { internshipId }
GET    /api/tracker           (JWT required) ?status=
PATCH  /api/tracker/:id       (JWT required) body: { status?, notes? }
DELETE /api/tracker/:id       (JWT required)
```

## Running on Render/Railway

Set environment variables in the dashboard. Start command: `node src/index.js`
