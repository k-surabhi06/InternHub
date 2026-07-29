require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // 1. Delete all Unstop rows with double-domain broken URLs
  const brokenResult = await prisma.internship.deleteMany({
    where: {
      source: 'Unstop',
      applyUrl: { startsWith: 'https://unstop.com/https://' },
    },
  });
  console.log(`Deleted ${brokenResult.count} broken double-domain Unstop URLs.`);

  // 2. Also delete any remaining Unstop rows that are NOT internships
  //    (i.e. applyUrl path starts with competitions/, hackathons/, quiz/, workshops-webinars/, events/, cultural/)
  const nonInternshipPrefixes = [
    'https://unstop.com/competitions/',
    'https://unstop.com/hackathons/',
    'https://unstop.com/quiz/',
    'https://unstop.com/workshops-webinars/',
    'https://unstop.com/events/',
    'https://unstop.com/cultural/',
    'https://unstop.com/conferences/',
  ];

  let nonInternshipDeleted = 0;
  for (const prefix of nonInternshipPrefixes) {
    const r = await prisma.internship.deleteMany({
      where: { source: 'Unstop', applyUrl: { startsWith: prefix } },
    });
    if (r.count > 0) {
      console.log(`  Deleted ${r.count} non-internship rows with prefix: ${prefix.replace('https://unstop.com/', '')}`);
      nonInternshipDeleted += r.count;
    }
  }
  console.log(`Deleted ${nonInternshipDeleted} non-internship Unstop rows.`);

  // 3. Show what remains
  const remaining = await prisma.internship.count({ where: { source: 'Unstop' } });
  console.log(`Unstop rows remaining in DB: ${remaining}`);

  await prisma.$disconnect();
})();
