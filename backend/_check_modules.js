// Check all backend modules load without errors
const files = [
  './src/controllers/profile.controller.js',
  './src/controllers/savedSearch.controller.js',
  './src/controllers/tracker.controller.js',
  './src/controllers/internship.controller.js',
  './src/routes/profile.routes.js',
  './src/routes/savedSearch.routes.js',
  './src/routes/tracker.routes.js',
];
files.forEach(f => {
  try {
    require(f);
    console.log('OK:', f);
  } catch(e) { console.log('ERROR in', f + ':', e.message); }
});
process.exit(0);
