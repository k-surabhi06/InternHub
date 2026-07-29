const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const {
  listSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  savedSearchValidators,
} = require('../controllers/savedSearch.controller');

const router = Router();
router.use(authenticate);

router.get('/', listSavedSearches);
router.post('/', savedSearchValidators, validate, createSavedSearch);
router.delete('/:id', deleteSavedSearch);

module.exports = router;
