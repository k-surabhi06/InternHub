/**
 * Cron scheduler — runs ingestion jobs on a schedule.
 * Deployed as a Render background worker: node scheduler.js
 *
 * Jobs:
 *   - Unstop API ingestion:        every 6 hours
 *   - Internshala scraper (Python): every 6 hours + 30 min offset
 *   - Mark stale internships:      every 24 hours at 2 AM
 */

require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const prisma = require('../backend/src/utils/prismaClient');

const { runUnstopIngestion } = require('./unstopIngestion');

// ─── Job: Unstop ingestion every 6 hours ─────────────────────────────────────
cron.schedule('0 */6 * * *', async () => {
  console.log(`[Cron] ${new Date().toISOString()} — Starting Unstop ingestion`);
  try {
    await runUnstopIngestion();
    console.log('[Cron] Unstop ingestion complete.');
  } catch (err) {
    console.error('[Cron] Unstop ingestion failed:', err.message);
  }
});

// ─── Job: Internshala scraper (Python) every 6 hours, offset by 30 min ───────
// Guards against missing Python gracefully — logs a clear warning instead of crashing.
cron.schedule('30 */6 * * *', () => {
  const scriptPath = path.resolve(__dirname, 'scrapers/internshala_scraper.py');
  console.log(`[Cron] ${new Date().toISOString()} — Starting Internshala scrape`);

  // Try python3 first (Linux/Render), fall back to python (Windows local dev)
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  exec(`${pythonCmd} "${scriptPath}"`, { timeout: 5 * 60 * 1000 }, (error, stdout, stderr) => {
    if (error) {
      if (error.code === 127 || error.message.includes('not found')) {
        console.warn('[Cron] Internshala scraper skipped — Python not available in this environment.');
        console.warn('[Cron] Run the scraper manually or via GitHub Actions.');
      } else {
        console.error('[Cron] Internshala scraper error:', error.message);
      }
      return;
    }
    if (stdout) console.log('[Cron][Internshala]', stdout.trim());
    if (stderr) console.warn('[Cron][Internshala stderr]', stderr.trim());
    console.log('[Cron] Internshala scrape complete.');
  });
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

console.log('InternHub scheduler running. Jobs: Unstop (every 6h), Internshala (every 6h+30m), Stale cleanup (daily 2am)');
