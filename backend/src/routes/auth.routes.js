const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const {
  register,
  login,
  me,
  registerValidators,
  loginValidators,
} = require('../controllers/auth.controller');

const router = Router();

router.post('/register', registerValidators, validate, register);
router.post('/login', loginValidators, validate, login);
router.get('/me', authenticate, me);

module.exports = router;
