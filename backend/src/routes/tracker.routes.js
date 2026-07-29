const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const {
  saveInternship,
  getTracker,
  updateTrackerItem,
  deleteTrackerItem,
  getTrackerStats,
  saveValidators,
  updateValidators,
} = require('../controllers/tracker.controller');

const router = Router();

router.use(authenticate);

router.get('/stats', getTrackerStats);
router.post('/', saveValidators, validate, saveInternship);
router.get('/', getTracker);
router.patch('/:id', updateValidators, validate, updateTrackerItem);
router.delete('/:id', deleteTrackerItem);

module.exports = router;
