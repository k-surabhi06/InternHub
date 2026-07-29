require('dotenv').config({ path: `${__dirname}/../backend/.env` });
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function stats() {
  const now = new Date();

  // Total counts
  const totalUnstop = await prisma.internship.count({ where: { source: 'Unstop' } });
  const activeUnstop = await prisma.internship.count({ where: { source: 'Unstop', isActive: true } });

  const totalInternshala = await prisma.internship.count({ where: { source: 'Internshala' } });
  const activeInternshala = await prisma.internship.count({ where: { source: 'Internshala', isActive: true } });

  // How many Unstop active listings have deadlines in next 3 days
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringIn3Days = await prisma.internship.count({
    where: {
      source: 'Unstop',
      isActive: true,
      deadline: { gt: now, lt: threeDaysFromNow }
    }
  });

  // Deadline distribution for active Unstop
  const noDeadline = await prisma.internship.count({ where: { source: 'Unstop', isActive: true, deadline: null } });
  const deadlineNext7d = await prisma.internship.count({ where: { source: 'Unstop', isActive: true, deadline: { gt: now, lt: new Date(now.getTime() + 7*24*60*60*1000) } } });
  const deadlineNext30d = await prisma.internship.count({ where: { source: 'Unstop', isActive: true, deadline: { gt: now, lt: new Date(now.getTime() + 30*24*60*60*1000) } } });
  const deadlineBeyond30d = await prisma.internship.count({ where: { source: 'Unstop', isActive: true, deadline: { gt: new Date(now.getTime() + 30*24*60*60*1000) } } });

  // Most recent scrape times
  const lastUnstop = await prisma.internship.findFirst({ where: { source: 'Unstop' }, orderBy: { scrapedAt: 'desc' }, select: { scrapedAt: true } });
  const lastInternshala = await prisma.internship.findFirst({ where: { source: 'Internshala' }, orderBy: { scrapedAt: 'desc' }, select: { scrapedAt: true } });

  console.log('=== CURRENT DB STATE ===');
  console.log('Unstop      — Total:', totalUnstop, '| Active now:', activeUnstop);
  console.log('Internshala — Total:', totalInternshala, '| Active now:', activeInternshala);
  console.log('');
  console.log('=== UNSTOP DEADLINE DISTRIBUTION (active only) ===');
  console.log('No deadline set:          ', noDeadline);
  console.log('Expiring in next 3 days:  ', expiringIn3Days, '← will be gone in 3 days');
  console.log('Expiring in next 7 days:  ', deadlineNext7d);
  console.log('Expiring in next 30 days: ', deadlineNext30d);
  console.log('Deadline beyond 30 days:  ', deadlineBeyond30d);
  console.log('');
  console.log('=== LAST SCRAPE TIMES ===');
  console.log('Unstop last scraped:      ', lastUnstop?.scrapedAt?.toISOString() ?? 'never');
  console.log('Internshala last scraped: ', lastInternshala?.scrapedAt?.toISOString() ?? 'never');

  await prisma.$disconnect();
}

stats().catch(console.error);
