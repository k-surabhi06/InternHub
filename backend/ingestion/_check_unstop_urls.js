require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.internship.findMany({
    where: { source: 'Unstop' },
    select: { id: true, applyUrl: true },
    take: 20,
    orderBy: { scrapedAt: 'asc' }, // oldest first — these are the broken ones
  });
  rows.forEach((r, i) => console.log(`[${i+1}] ${r.applyUrl}`));
  await prisma.$disconnect();
})();
