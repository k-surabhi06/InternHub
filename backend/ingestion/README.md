# InternHub — Ingestion Scripts

Data ingestion layer — decoupled from the main API.

## Setup

### Node.js (Unstop API + Scheduler)

```bash
cd ingestion
npm install        # shares backend node_modules — run from backend first, or:
# Alternatively, install only needed packages:
npm install --prefix . node-cron @prisma/client dotenv
npx prisma generate --schema ../backend/prisma/schema.prisma
```

### Python (Internshala Scraper)

```bash
cd ingestion
pip install -r requirements.txt
```

## Running

**Unstop ingestion (one-off):**
```bash
node unstopIngestion.js
```

**Internshala scraper (one-off):**
```bash
python scrapers/internshala_scraper.py
```

**Scheduler (runs both on cron schedule):**
```bash
node scheduler.js
```

## Environment Variables

Copy `../backend/.env` or set `DATABASE_URL` before running any ingestion script.

## Schedule

| Job                    | Schedule         |
|-----------------------|-----------------|
| Unstop ingestion       | Every 6 hours   |
| Internshala scraper    | Every 6h + 30m  |
| Mark stale inactive    | Daily at 2am    |

## Notes on scraping

- The scraper respects `robots.txt` and adds a 2-second delay between page requests.
- A broken scraper **will not crash the API** — they are completely separate processes.
- The `applyUrl` column is the dedup key: running the scraper twice won't create duplicates.
