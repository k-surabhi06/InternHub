require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const internshipRoutes = require('./routes/internship.routes');
const trackerRoutes = require('./routes/tracker.routes');
const profileRoutes = require('./routes/profile.routes');
const savedSearchRoutes = require('./routes/savedSearch.routes');
const resumeRoutes = require('./routes/resume.routes');
const internalRoutes = require('./routes/internal.routes');

const app = express();

// ─── Global Middleware ─────────────────────────────────────────────────────────
// Allow local dev, the deployed Vercel frontend, and an optional CORS_ORIGIN env var.
const allowedOrigins = [
  'http://localhost:3000',
  'https://internhub-frontend-surabhi-ks-projects-83bea278.vercel.app',
  process.env.CORS_ORIGIN,
].filter(Boolean); // remove undefined if CORS_ORIGIN not set

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Static file serving — uploaded resumes ───────────────────────────────────
// Serves  backend/uploads/  at  GET /uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/internal', internalRoutes);

// ─── 404 fallthrough ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`InternHub API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
