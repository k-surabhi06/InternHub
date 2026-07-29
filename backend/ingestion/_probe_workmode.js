// Probe Unstop API — print every work-mode related field for 30 listings
require('dotenv').config({ path: `${__dirname}/../backend/.env` });

async function probe() {
  const url = 'https://unstop.com/api/public/opportunity/search-result?opportunity=internships&size=30&page=1';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  });
  const json = await res.json();
  const listings = json?.data?.data ?? [];

  const seen = new Set();

  listings.forEach((raw, i) => {
    const jd = raw.jobDetail;
    const key = `${jd?.type}|${raw.region}|${jd?.timing}`;
    if (!seen.has(key)) {
      seen.add(key);
      console.log(
        (i+1) + '.', raw.title?.substring(0, 30).padEnd(30),
        '| jd.type:', String(jd?.type ?? 'null').padEnd(10),
        '| region:', String(raw.region ?? 'null').padEnd(10),
        '| jd.timing:', String(jd?.timing ?? 'null').padEnd(12),
        '| locations:', JSON.stringify(jd?.locations ?? [])
      );
    }
  });

  // Count distinct jobDetail.type values
  const typeCounts = {};
  listings.forEach(raw => {
    const t = raw.jobDetail?.type ?? 'null';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  console.log('\njobDetail.type distribution:', typeCounts);

  const regionCounts = {};
  listings.forEach(raw => {
    const r = raw.region ?? 'null';
    regionCounts[r] = (regionCounts[r] || 0) + 1;
  });
  console.log('region distribution:', regionCounts);
}

probe().catch(console.error);
