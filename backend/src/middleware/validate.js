const { validationResult } = require('express-validator');

/**
 * Express middleware that runs after express-validator chains.
 * Returns 400 with the first validation error if any exist.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  }
  next();
}

module.exports = { validate };
