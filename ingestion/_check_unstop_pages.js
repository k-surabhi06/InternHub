(async () => {
  const res = await fetch('https://unstop.com/api/public/opportunity/search-result?opportunity=internships&size=20&page=1', {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
  });
  const json = await res.json();
  console.log('per_page:', json?.data?.per_page);
  console.log('total:', json?.data?.total);
  console.log('last_page:', json?.data?.last_page);
  console.log('items on page 1:', json?.data?.data?.length);
})();
