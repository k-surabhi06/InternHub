const { Router } = require('express');
const { listInternships, getInternship, lastSynced } = require('../controllers/internship.controller');

const router = Router();

router.get('/meta/last-synced', lastSynced);
router.get('/', listInternships);
router.get('/:id', getInternship);

module.exports = router;
