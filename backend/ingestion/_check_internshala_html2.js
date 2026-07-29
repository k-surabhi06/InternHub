const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  const html = await fetchPage('https://internshala.com/internships/');

  // Extract snippets around internship_item_location
  const locSnippets = [...html.matchAll(/(.{0,200}internship_item_location.{0,200})/g)].slice(0, 3);
  console.log('=== internship_item_location snippets ===');
  locSnippets.forEach(m => console.log(m[1].replace(/\s+/g, ' ').trim(), '\n---'));

  // Check stipend selector
  console.log('\n.stipend exists:', html.includes('"stipend"') || html.includes('class="stipend'));
  const stipendSnip = [...html.matchAll(/(.{0,150}stipend.{0,150})/g)].slice(0, 2);
  stipendSnip.forEach(m => console.log('  Stipend snippet:', m[1].replace(/\s+/g, ' ').trim()));

  // Check duration selector
  const durSnip = [...html.matchAll(/(.{0,150}duration.{0,150})/g)].slice(0, 2);
  console.log('\nDuration snippets:');
  durSnip.forEach(m => console.log(' ', m[1].replace(/\s+/g, ' ').trim()));
})();
