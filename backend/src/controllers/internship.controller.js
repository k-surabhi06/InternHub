const prisma = require('../utils/prismaClient');

/**
 * GET /api/internships
 * Query params: search, location, source, stipend, duration, sort, page, limit
 */
async function listInternships(req, res) {
  try {
    const {
      search = '',
      location = '',
      source = '',
      stipend = '',
      duration = '',
      workMode = '',
      sort = 'newest',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
      ...(source && { source: source }),
      ...(stipend && { stipend: { contains: stipend, mode: 'insensitive' } }),
      ...(duration && { duration: { contains: duration, mode: 'insensitive' } }),
      ...(workMode && { workMode: workMode }),
    };

    const stipendSort = sort === 'stipend_asc' || sort === 'stipend_desc';

    const orderBy =
      sort === 'oldest'
        ? { scrapedAt: 'asc' }
        : sort === 'title'
        ? { title: 'asc' }
        : sort === 'company'
        ? { company: 'asc' }
        : stipendSort
        ? { scrapedAt: 'desc' } // placeholder — we sort in JS after fetch
        : { scrapedAt: 'desc' }; // default: newest

    const [rawInternships, total] = await Promise.all([
      prisma.internship.findMany({
        where,
        orderBy,
        // For stipend sort fetch all matching (up to 1000) then sort+paginate in JS
        // For other sorts use normal DB pagination
        ...(stipendSort ? { take: 1000 } : { skip, take: pageSize }),
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          stipend: true,
          duration: true,
          postedDate: true,
          applyUrl: true,
          source: true,
          workMode: true,
          isActive: true,
          scrapedAt: true,
        },
      }),
      prisma.internship.count({ where }),
    ]);

    // ── Stipend sort: extract numeric value from string, sort in JS ──────────
    let internships = rawInternships;
    if (stipendSort) {
      internships = [...rawInternships].sort((a, b) => {
        const parse = (s) => {
          if (!s) return -1; // null stipend → treat as lowest
          const lower = s.toLowerCase();
          if (lower.includes('unpaid')) return 0;
          // Extract first number from strings like "₹10,000 – ₹15,000/month" or "10000"
          const match = s.replace(/,/g, '').match(/\d+/);
          return match ? parseInt(match[0], 10) : -1;
        };
        const diff = parse(a.stipend) - parse(b.stipend);
        return sort === 'stipend_asc' ? diff : -diff;
      });
      // Paginate in JS after sort
      internships = internships.slice(skip, skip + pageSize);
    }

    return res.json({
      data: internships,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('[listInternships]', err);
    return res.status(500).json({ error: 'Failed to fetch internships.' });
  }
}

/**
 * GET /api/internships/:id
 */
async function getInternship(req, res) {
  try {
    const internship = await prisma.internship.findUnique({
      where: { id: req.params.id },
    });
    if (!internship) return res.status(404).json({ error: 'Internship not found.' });
    return res.json({ data: internship });
  } catch (err) {
    console.error('[getInternship]', err);
    return res.status(500).json({ error: 'Failed to fetch internship.' });
  }
}

/**
 * GET /api/internships/meta/last-synced
 * Returns the most recent scrapedAt timestamp per source.
 */
async function lastSynced(req, res) {
  try {
    const rows = await prisma.internship.groupBy({
      by: ['source'],
      _max: { scrapedAt: true },
    });
    const result = {};
    rows.forEach((r) => {
      result[r.source] = r._max.scrapedAt;
    });
    return res.json({ data: result });
  } catch (err) {
    console.error('[lastSynced]', err);
    return res.status(500).json({ error: 'Failed to fetch sync info.' });
  }
}

module.exports = { listInternships, getInternship, lastSynced };
