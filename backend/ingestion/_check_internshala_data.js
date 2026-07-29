require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  // Get a sample of all Internshala rows and see what fields are populated
  const rows = await prisma.internship.findMany({
    where: { source: 'Internshala', isActive: true },
    select: { title: true, company: true, location: true, stipend: true, duration: true },
    take: 10,
    orderBy: { scrapedAt: 'desc' }
  });
  console.log('Recent Internshala rows:');
  rows.forEach((r, i) => {
    console.log(`[${i+1}] title: ${r.title}`);
    console.log(`     location: ${JSON.stringify(r.location)}`);
    console.log(`     stipend:  ${JSON.stringify(r.stipend)}`);
    console.log(`     duration: ${JSON.stringify(r.duration)}`);
  });

  // Count rows with non-null location
  const withLocation = await prisma.internship.count({
    where: { source: 'Internshala', isActive: true, location: { not: null } }
  });
  const total = await prisma.internship.count({
    where: { source: 'Internshala', isActive: true }
  });
  console.log(`\nInternshala: ${withLocation}/${total} rows have a location`);

  await prisma.$disconnect();
})();
