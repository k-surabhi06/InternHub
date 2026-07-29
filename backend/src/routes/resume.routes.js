const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const {
  uploadResume,
  listResumes,
  deleteResume,
  uploadMiddleware,
  uploadValidators,
} = require('../controllers/resume.controller');

const router = Router();
router.use(authenticate);

/**
 * Multer errors (wrong file type, size exceeded) need their own handler
 * because they happen in middleware before our controller runs.
 */
function handleUpload(req, res, next) {
  uploadMiddleware(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10 MB.' });
    }
    // multer fileFilter rejection or other errors
    return res.status(400).json({ error: err.message || 'File upload error.' });
  });
}

router.post('/', handleUpload, uploadValidators, validate, uploadResume);
router.get('/', listResumes);
router.delete('/:id', deleteResume);

module.exports = router;
