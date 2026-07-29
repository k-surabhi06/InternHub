# InternHub — Frontend

React.js SPA.

## Setup

```bash
cd frontend
npm install
cp .env.example .env      # set REACT_APP_API_URL
npm start                 # dev server on localhost:3000
npm run build             # production build
```

## Environment Variables

| Variable              | Description                     |
|----------------------|---------------------------------|
| `REACT_APP_API_URL`  | Backend API base URL (e.g. `https://internhub-api.onrender.com/api`) |

## Deploying to Vercel

1. Connect the `frontend/` directory as a Vercel project.
2. Set `REACT_APP_API_URL` in Vercel's environment variables.
3. Build command: `npm run build`, Output dir: `build`.

## Pages

| Route             | Description                          |
|------------------|--------------------------------------|
| `/`              | Landing page with search             |
| `/browse`        | Internship listings with filters     |
| `/internships/:id` | Detail view                        |
| `/login`         | Login                                |
| `/register`      | Register                             |
| `/tracker`       | Application tracker (auth required)  |
