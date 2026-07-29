/**
 * Ingestion service for the Unstop public API.
 * Can be run standalone: node ingestion/unstopIngestion.js
 * Or imported and called by the cron scheduler.
 *
 * Unstop public API: https://unstop.com/api/public/opportunity/search-listing
 * (No auth key required for the public search endpoint)
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
// Use the backend's already-generated Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const UNSTOP_API_URL = 'https://unstop.com/api/public/opportunity/search-result';
const DEFAULT_PARAMS = {
  opportunity: 'internships', // correct param — returns internship listings (subtype: 'internships')
  size: 20,
  page: 1,
};

/**
 * Fetch one page of internship listings from Unstop.
 * @param {number} page - 1-indexed page number
 * @returns {Promise<object[]>} raw listing objects
 */
async function fetchUnstopPage(page = 1) {
  const params = new URLSearchParams({ ...DEFAULT_PARAMS, page: String(page) });
  const url = `${UNSTOP_API_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Unstop API responded with ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  // Response shape: { data: { data: [...], last_page: N } }
  return {
    listings: json?.data?.data ?? [],
    lastPage: json?.data?.last_page ?? 1,
  };
}

/**
 * Map a raw Unstop listing to our Internship schema shape.
 * @param {object} raw - raw listing from Unstop API
 * @returns {object} shaped for prisma.internship.upsert
 */
/**
 * Normalize Unstop's work mode values to our WorkMode enum.
 * Only classifies based on explicit source data — no inference.
 * @param {object} raw - raw listing from Unstop API
 * @returns {{ workMode: string|null, sourceWorkMode: string|null }}
 */
function normalizeUnstopWorkMode(raw) {
  // ONLY use raw.jobDetail.type — the actual work mode field.
  // raw.region is ALWAYS "online" for every listing regardless of work mode,
  // so it is NOT a reliable signal and must be ignored entirely.
  //
  // Confirmed jobDetail.type values from live API:
  //   'wfh'       → Remote
  //   'hybrid'    → Hybrid
  //   'in_office' → OnSite   ← NOTE: underscore, not hyphen
  const jobType = raw.jobDetail?.type?.toLowerCase?.() ?? '';

  if (jobType === 'hybrid') {
    return { workMode: 'Hybrid', sourceWorkMode: jobType };
  }
  if (jobType === 'wfh' || jobType === 'remote') {
    return { workMode: 'Remote', sourceWorkMode: jobType };
  }
  if (jobType === 'in_office' || jobType === 'office' || jobType === 'in-office') {
    return { workMode: 'OnSite', sourceWorkMode: jobType };
  }
  // Unknown / missing — store raw value for debugging, don't guess
  return { workMode: null, sourceWorkMode: jobType || null };
}

function mapUnstopListing(raw) {
  // seo_url is already a full URL e.g. "https://unstop.com/internships/frontend-dev-company-123"
  // public_url is a relative path e.g. "internships/frontend-dev-company-123"
  // Prefer seo_url (full URL) → fall back to constructing from public_url → last resort by id
  let applyUrl;
  if (raw.seo_url && raw.seo_url.startsWith('http')) {
    applyUrl = raw.seo_url;
  } else if (raw.public_url) {
    applyUrl = `https://unstop.com/${raw.public_url.replace(/^\//, '')}`;
  } else {
    applyUrl = `https://unstop.com/internships/${raw.id}`;
  }

  // Location: from locations array or filters
  let location = null;
  if (Array.isArray(raw.locations) && raw.locations.length > 0) {
    location = raw.locations.map((l) => l.city || l.name || '').filter(Boolean).join(', ');
  } else if (raw.region === 'online') {
    location = 'Remote';
  }

  // Deadline: Unstop sends ISO timestamps like "2026-08-03T00:00:00+05:30"
  const deadline = raw.end_date ? new Date(raw.end_date) : null;
  const now = new Date();

  // isActive = registration must be open AND status not closed AND deadline not passed
  // regn_open: 1 = open, 0 = closed
  const isActive =
    raw.regn_open === 1 &&
    raw.status === 'LIVE' &&
    (deadline === null || deadline > now);

  const { workMode, sourceWorkMode } = normalizeUnstopWorkMode(raw);

  // ── Stipend from jobDetail ──────────────────────────────────────────────────
  // Fields: min_salary, max_salary, paid_unpaid ('paid'|'unpaid'), not_disclosed (bool)
  let stipend = null;
  const jd = raw.jobDetail;
  if (jd) {
    if (jd.not_disclosed) {
      stipend = 'Stipend not disclosed';
    } else if (jd.paid_unpaid === 'unpaid') {
      stipend = 'Unpaid';
    } else if (jd.min_salary != null) {
      const min = Number(jd.min_salary).toLocaleString('en-IN');
      const max = jd.max_salary != null ? Number(jd.max_salary).toLocaleString('en-IN') : null;
      stipend = max && max !== min ? `₹${min} – ₹${max}/month` : `₹${min}/month`;
    }
  }

  // ── Duration: not provided in jobDetail — leave null (Unstop doesn't expose it) ──
  let duration = null;

  return {
    title: raw.title || 'Untitled',
    company: raw.organisation?.name || 'Unknown Company',
    location,
    stipend,
    duration,
    description: null,
    applyUrl,
    source: 'Unstop',
    sourceId: String(raw.id),
    workMode,
    sourceWorkMode,
    deadline,
    isActive,
  };
}

/**
 * Main ingestion runner. Fetches pages until empty and upserts each listing.
 */
const MAX_PAGES = 500; // 500 pages × 10 listings = up to 5,000 internships

async function runUnstopIngestion() {
  console.log('[Unstop] Starting ingestion...');
  let page = 1;
  let lastPage = 1;
  let totalUpserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  do {
    let listings;
    try {
      const result = await fetchUnstopPage(page);
      listings = result.listings;
      lastPage = result.lastPage;
    } catch (err) {
      console.error(`[Unstop] Failed to fetch page ${page}:`, err.message);
      break;
    }

    if (!listings.length) {
      console.log(`[Unstop] No listings at page ${page}. Done.`);
      break;
    }

    // Safety filter: keep only listings with subtype=internships (the endpoint is dedicated
    // but occasionally mixes in full-time jobs with subtype=jobs)
    const internshipListings = listings.filter((raw) => !raw.subtype || raw.subtype === 'internships');
    totalSkipped += listings.length - internshipListings.length;

    for (const raw of internshipListings) {
      try {
        const data = mapUnstopListing(raw);
        await prisma.internship.upsert({
          where: { applyUrl: data.applyUrl },
          create: data,
          update: {
            title: data.title,
            company: data.company,
            location: data.location,
            stipend: data.stipend,
            duration: data.duration,
            workMode: data.workMode,
            sourceWorkMode: data.sourceWorkMode,
            deadline: data.deadline,
            isActive: data.isActive,
            scrapedAt: new Date(),
          },
        });
        totalUpserted++;
      } catch (err) {
        console.error(`[Unstop] Error upserting listing ${raw.id}:`, err.message);
        totalErrors++;
      }
    }

    console.log(`[Unstop] Page ${page}/${lastPage}: upserted ${listings.length} listings.`);
    page++;

    // Polite delay between pages
    await new Promise((r) => setTimeout(r, 500));
  } while (page <= Math.min(lastPage, MAX_PAGES));

  console.log(`[Unstop] Ingestion complete. Upserted: ${totalUpserted}, Skipped (non-internship): ${totalSkipped}, Errors: ${totalErrors}`);
  await prisma.$disconnect();
}

// Run directly if invoked as a script
if (require.main === module) {
  runUnstopIngestion().catch((err) => {
    console.error('[Unstop] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runUnstopIngestion };
