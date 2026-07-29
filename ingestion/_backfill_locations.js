/**
 * Backfill location for existing Internshala rows by extracting the city
 * from the applyUrl slug (e.g. "internship-in-bangalore-at-company-123" → "Bangalore").
 * This avoids re-scraping and works instantly on all 698 rows.
 */
require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

function extractLocationFromUrl(applyUrl) {
  const slug = applyUrl.toLowerCase();
  // Work-from-home URLs don't have a city
  if (slug.includes('work-from-home') || slug.includes('/wfh')) return null;
  // Match '-in-<city>-at-' pattern in the URL
  const match = slug.match(/-in-([a-z][a-z-]+?)-at-/);
  if (match) {
    return match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return null;
}

(async () => {
  const rows = await prisma.internship.findMany({
    where: { source: 'Internshala', location: null },
    select: { id: true, applyUrl: true },
  });

  console.log(`Found ${rows.length} Internshala rows with null location. Backfilling...`);

  let updated = 0;
  let noCity = 0;

  for (const row of rows) {
    const location = extractLocationFromUrl(row.applyUrl);
    if (location) {
      await prisma.internship.update({
        where: { id: row.id },
        data: { location },
      });
      updated++;
    } else {
      noCity++;
    }
  }

  console.log(`Done. Updated: ${updated}, No city in URL (WFH/unknown): ${noCity}`);

  // Verify
  const withLoc = await prisma.internship.count({
    where: { source: 'Internshala', location: { not: null } }
  });
  const total = await prisma.internship.count({ where: { source: 'Internshala' } });
  console.log(`Internshala rows with location: ${withLoc}/${total}`);

  await prisma.$disconnect();
})();
