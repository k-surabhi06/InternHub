/**
 * Backfill script — re-fetches Unstop listings and corrects their workMode.
 * Previously ALL listings were set to Remote because raw.region='online' was
 * used as a fallback. Now only raw.jobDetail.type is used.
 *
 * Run: node ingestion/backfill_workmode.js
 */

require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const UNSTOP_API_URL = 'https://unstop.com/api/public/opportunity/search-result';
const MAX_PAGES = 500;
const PAGE_SIZE = 20;

function normalizeWorkMode(raw) {
  const jobType = raw.jobDetail?.type?.toLowerCase?.() ?? '';
  if (jobType === 'hybrid')                                     return 'Hybrid';
  if (jobType === 'wfh' || jobType === 'remote')                return 'Remote';
  if (jobType === 'in_office' || jobType === 'office' || jobType === 'in-office') return 'OnSite';
  return null;
}

async function run() {
  console.log('[WorkMode Backfill] Starting...');
  let page = 1;
  let lastPage = 1;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  do {
    const params = new URLSearchParams({ opportunity: 'internships', size: PAGE_SIZE, page });
    const url = `${UNSTOP_API_URL}?${params}`;

    let listings;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
      });
      const json = await res.json();
      listings = json?.data?.data ?? [];
      lastPage = json?.data?.last_page ?? 1;
    } catch (err) {
      console.error(`[WorkMode Backfill] Fetch error page ${page}:`, err.message);
      break;
    }

    if (!listings.length) break;

    for (const raw of listings) {
      const correctWorkMode = normalizeWorkMode(raw);
      const sourceId = String(raw.id);

      try {
        // Only update if workMode is actually wrong (avoid unnecessary writes)
        const existing = await prisma.internship.findFirst({
          where: { sourceId, source: 'Unstop' },
          select: { id: true, workMode: true, sourceWorkMode: true }
        });

        if (!existing) { skipped++; continue; }

        if (existing.workMode !== correctWorkMode) {
          await prisma.internship.update({
            where: { id: existing.id },
            data: {
              workMode: correctWorkMode,
              sourceWorkMode: raw.jobDetail?.type ?? null,
            }
          });
          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`[WorkMode Backfill] Error updating sourceId ${sourceId}:`, err.message);
        errors++;
      }
    }

    console.log(`[WorkMode Backfill] Page ${page}/${lastPage} — updated: ${updated}, skipped: ${skipped}, errors: ${errors}`);
    page++;
    await new Promise(r => setTimeout(r, 300));

  } while (page <= Math.min(lastPage, MAX_PAGES));

  // Final DB stats
  const remote  = await prisma.internship.count({ where: { source: 'Unstop', workMode: 'Remote', isActive: true } });
  const onsite  = await prisma.internship.count({ where: { source: 'Unstop', workMode: 'OnSite', isActive: true } });
  const hybrid  = await prisma.internship.count({ where: { source: 'Unstop', workMode: 'Hybrid', isActive: true } });
  const unknown = await prisma.internship.count({ where: { source: 'Unstop', workMode: null,     isActive: true } });

  console.log(`\n[WorkMode Backfill] Done. Updated: ${updated}, Skipped (already correct): ${skipped}, Errors: ${errors}`);
  console.log(`[WorkMode Backfill] Active Unstop — Remote: ${remote}, OnSite: ${onsite}, Hybrid: ${hybrid}, Unknown: ${unknown}`);

  await prisma.$disconnect();
}

run().catch(err => {
  console.error('[WorkMode Backfill] Fatal:', err);
  process.exit(1);
});
