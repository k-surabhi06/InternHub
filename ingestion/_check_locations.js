require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  // Check distinct location values stored for Internshala
  const rows = await prisma.internship.findMany({
    where: { source: 'Internshala', isActive: true },
    select: { location: true },
    take: 30,
    orderBy: { scrapedAt: 'desc' }
  });
  const locations = [...new Set(rows.map(r => r.location).filter(Boolean))];
  console.log('Sample Internshala locations in DB:');
  locations.forEach(l => console.log(' ', JSON.stringify(l)));

  // Also try searching for "Bangalore" directly
  const bangaloreCount = await prisma.internship.count({
    where: {
      source: 'Internshala',
      isActive: true,
      location: { contains: 'Bangalore', mode: 'insensitive' }
    }
  });
  console.log(`\nRows matching "Bangalore": ${bangaloreCount}`);

  // Try "bangalore" lowercase
  const bangaloreCount2 = await prisma.internship.count({
    where: {
      source: 'Internshala',
      isActive: true,
      location: { contains: 'angalore', mode: 'insensitive' }
    }
  });
  console.log(`Rows matching "angalore" (partial): ${bangaloreCount2}`);

  await prisma.$disconnect();
})();
