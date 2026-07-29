/**
 * Cron scheduler (mainly for local development).
 *
 * Jobs:
 *   - Refresh internships every 6 hours
 *   - Mark stale internships inactive every day at 2 AM
 *
 * Production deployments trigger the refresh endpoint
 * using an external scheduler (GitHub Actions).
 */
require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { refreshInternships } = require('./refreshService');
const cron = require('node-cron');
const prisma = require('../src/utils/prismaClient');

// ─── Job: Refresh internships every 6 hours ──────────────────────────────────
cron.schedule('0 */6 * * *', async () => {
  await refreshInternships();
});

// ─── Job: Mark expired/stale internships as inactive — runs daily at 2 AM ────
cron.schedule('0 2 * * *', async () => {
  console.log(`[Cron] ${new Date().toISOString()} — Marking expired internships inactive`);
  try {
    const now = new Date();
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Mark any record whose deadline has explicitly passed
    const { count: deadlineExpired } = await prisma.internship.updateMany({
      where: {
        isActive: true,
        deadline: { lt: now },
      },
      data: { isActive: false },
    });

    // 2. Mark any record not re-scraped in 30+ days (probably removed from source)
    const { count: staleExpired } = await prisma.internship.updateMany({
      where: {
        isActive: true,
        deadline: null,           // only stale-check records with no explicit deadline
        scrapedAt: { lt: cutoff },
      },
      data: { isActive: false },
    });

    console.log(`[Cron] Marked inactive — deadline passed: ${deadlineExpired}, stale (30d): ${staleExpired}`);
  } catch (err) {
    console.error('[Cron] Expired-marking job failed:', err.message);
  }
});

console.log(
  "InternHub scheduler running. Jobs: Refresh internships (every 6h), Stale cleanup (daily 2 AM)."
);