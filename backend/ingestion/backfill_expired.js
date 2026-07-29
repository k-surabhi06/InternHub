/**
 * One-time backfill script — marks internships with past deadlines as inactive.
 * Run once: node ingestion/backfill_expired.js
 *
 * What it does:
 *   1. Marks all Unstop records where deadline < now as isActive: false
 *   2. Marks all Internshala records as isActive: false (they have no deadline field,
 *      so we rely on the next scrape cycle to mark the active ones back)
 *
 * Safe to re-run — it only ever sets isActive: false, never deletes.
 */

require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const now = new Date();

  // ── 1. Unstop: mark any record whose deadline has passed ───────────────────
  const { count: unstopExpired } = await prisma.internship.updateMany({
    where: {
      source: 'Unstop',
      isActive: true,
      deadline: { lt: now },    // deadline exists AND is in the past
    },
    data: { isActive: false },
  });
  console.log(`[Backfill] Unstop — marked ${unstopExpired} expired records as inactive.`);

  // ── 2. Internshala: no deadline field — mark ALL inactive so the next ───────
  //    scrape cycle re-activates only the currently-open listings.
  const { count: internshalaReset } = await prisma.internship.updateMany({
    where: { source: 'Internshala', isActive: true },
    data: { isActive: false },
  });
  console.log(`[Backfill] Internshala — reset ${internshalaReset} records to inactive (next scrape will reactivate open ones).`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  const activeUnstop = await prisma.internship.count({ where: { source: 'Unstop', isActive: true } });
  const activeInternshala = await prisma.internship.count({ where: { source: 'Internshala', isActive: true } });
  console.log(`\n[Backfill] Done. Active now — Unstop: ${activeUnstop}, Internshala: ${activeInternshala}`);

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('[Backfill] Fatal error:', err);
  process.exit(1);
});
