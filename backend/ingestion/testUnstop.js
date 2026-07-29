const URLS = [
  'https://unstop.com/api/public/opportunity/search-result?type=internship&size=2&page=1',
];

(async () => {
  for (const url of URLS) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });
      const json = await res.json();
      console.log('Top keys:', Object.keys(json));
      console.log('data keys:', Object.keys(json.data || {}));
      const first = json?.data?.data?.[0];
      if (first) {
        console.log('\nFirst listing keys:', Object.keys(first));
        console.log('\nFirst listing sample:');
        console.log(JSON.stringify(first, null, 2).slice(0, 1500));
      }
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
})();
