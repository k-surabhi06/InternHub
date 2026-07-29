const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { getProfile, updateProfile, uploadResume, updateProfileValidators } = require('../controllers/profile.controller');

const router = Router();
router.use(authenticate);

router.get('/', getProfile);
router.patch('/', updateProfileValidators, validate, updateProfile);
router.post('/resume', uploadResume);

module.exports = router;
