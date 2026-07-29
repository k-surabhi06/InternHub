require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const bangalore = await prisma.internship.count({
    where: { source: 'Internshala', location: { contains: 'Bangalore', mode: 'insensitive' } }
  });
  const sample = await prisma.internship.findMany({
    where: { source: 'Internshala', location: { not: null } },
    select: { title: true, location: true },
    take: 8, orderBy: { scrapedAt: 'desc' }
  });
  console.log(`Bangalore matches: ${bangalore}`);
  console.log('Sample locations:');
  sample.forEach(r => console.log(` "${r.location}" — ${r.title}`));
  await prisma.$disconnect();
})();
