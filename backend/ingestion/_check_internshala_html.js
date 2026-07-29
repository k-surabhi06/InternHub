// Fetch a real Internshala page and inspect what location-related classes exist
const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  const html = await fetchPage('https://internshala.com/internships/');

  // Find all class names that contain 'location' or 'city'
  const classMatches = [...html.matchAll(/class="([^"]*(?:locat|city|place|region)[^"]*)"/gi)];
  const found = new Set(classMatches.map(m => m[1]));
  console.log('Classes containing location/city/place/region:');
  found.forEach(c => console.log(' ', c));

  // Also grab a raw snippet around any location text
  const snippets = [...html.matchAll(/(.{0,80}bangalore.{0,80})/gi)].slice(0, 5);
  console.log('\nSnippets mentioning "bangalore":');
  snippets.forEach(m => console.log(' ', m[1].replace(/\s+/g, ' ').trim()));

  // Check if the old selectors exist
  console.log('\n.location-link exists:', html.includes('location-link'));
  console.log('.location_link exists:', html.includes('location_link'));
  console.log('[id*="location"] exists:', /id="[^"]*location/i.test(html));
})();
