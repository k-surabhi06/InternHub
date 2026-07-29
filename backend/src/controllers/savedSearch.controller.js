const prisma = require('../utils/prismaClient');
const { body } = require('express-validator');

const savedSearchValidators = [
  body('label').trim().notEmpty().withMessage('label is required.'),
  body('search').optional().isString(),
  body('location').optional().isString(),
  body('source').optional().isString(),
];

/**
 * GET /api/saved-searches
 */
async function listSavedSearches(req, res) {
  try {
    const searches = await prisma.savedSearch.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ data: searches });
  } catch (err) {
    console.error('[listSavedSearches]', err);
    return res.status(500).json({ error: 'Could not fetch saved searches.' });
  }
}

/**
 * POST /api/saved-searches
 */
async function createSavedSearch(req, res) {
  try {
    const { label, search, location, source } = req.body;
    const saved = await prisma.savedSearch.create({
      data: { userId: req.user.id, label, search, location, source },
    });
    return res.status(201).json({ data: saved });
  } catch (err) {
    console.error('[createSavedSearch]', err);
    return res.status(500).json({ error: 'Could not save search.' });
  }
}

/**
 * DELETE /api/saved-searches/:id
 */
async function deleteSavedSearch(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Saved search not found.' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });
    await prisma.savedSearch.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('[deleteSavedSearch]', err);
    return res.status(500).json({ error: 'Could not delete saved search.' });
  }
}

module.exports = { listSavedSearches, createSavedSearch, deleteSavedSearch, savedSearchValidators };
