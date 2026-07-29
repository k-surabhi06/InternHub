fetch('https://unstop.com/api/public/opportunity/search-result?opportunity=internships&size=5&page=1', {
  headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
})
.then(r => r.json())
.then(json => {
  const listings = json?.data?.data ?? [];
  listings.forEach((raw, i) => {
    const jd = raw.jobDetail;
    let stipend = null;
    if (jd) {
      if (jd.not_disclosed) stipend = 'Stipend not disclosed';
      else if (jd.paid_unpaid === 'unpaid') stipend = 'Unpaid';
      else if (jd.min_salary != null) {
        const min = Number(jd.min_salary).toLocaleString('en-IN');
        const max = jd.max_salary != null ? Number(jd.max_salary).toLocaleString('en-IN') : null;
        stipend = (max && max !== min) ? ('Rs.' + min + ' - Rs.' + max + '/month') : ('Rs.' + min + '/month');
      }
    }
    const jobType = jd?.type ?? 'n/a';
    console.log((i+1) + '.', raw.title, '|', raw.organisation?.name, '| stipend:', stipend, '| workType:', jobType);
  });
})
.catch(e => console.error(e.message));
