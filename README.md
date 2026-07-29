# InternHub — Internship Aggregator & Tracker

A full-stack web application that aggregates internship listings from Internshala and Unstop into one searchable, filterable portal where students can register, browse, save internships to a personal dashboard, and track their application status.

## Project Structure

```
internhub/
├── backend/          # Node.js + Express + Prisma REST API
├── frontend/         # React.js SPA
└── ingestion/        # Python scrapers + Unstop API integration
```

## Quick Start

See `backend/README.md`, `frontend/README.md`, and `ingestion/README.md` for individual setup instructions.

## Tech Stack

- **Frontend**: React.js, React Router DOM, Axios
- **Backend**: Node.js, Express.js, Prisma ORM
- **Database**: PostgreSQL (Neon in production)
- **Auth**: JWT + bcrypt.js
- **Ingestion**: Python + BeautifulSoup4 (Internshala), Node.js (Unstop)
- **Deployment**: Vercel (frontend), Render/Railway (backend), Neon (Postgres)
