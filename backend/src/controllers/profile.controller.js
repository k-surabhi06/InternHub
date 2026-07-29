const prisma = require('../utils/prismaClient');
const { body } = require('express-validator');
const path = require('path');
const fs = require('fs');

const updateProfileValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('preferredRole').optional().isString(),
  body('preferredLocation').optional().isString(),
  body('preferredStipend').optional().isString(),
];

/**
 * GET /api/profile
 */
async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, createdAt: true,
        resumeUrl: true, preferredRole: true,
        preferredLocation: true, preferredStipend: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ data: user });
  } catch (err) {
    console.error('[getProfile]', err);
    return res.status(500).json({ error: 'Could not fetch profile.' });
  }
}

/**
 * PATCH /api/profile  — update name / preferences
 */
async function updateProfile(req, res) {
  try {
    const { name, preferredRole, preferredLocation, preferredStipend } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(preferredRole !== undefined && { preferredRole }),
        ...(preferredLocation !== undefined && { preferredLocation }),
        ...(preferredStipend !== undefined && { preferredStipend }),
      },
      select: {
        id: true, name: true, email: true, createdAt: true,
        resumeUrl: true, preferredRole: true,
        preferredLocation: true, preferredStipend: true,
      },
    });
    return res.json({ data: updated });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ error: 'Could not update profile.' });
  }
}

/**
 * POST /api/profile/resume  — upload a PDF resume (base64 encoded, stored as data URL)
 * Accepts JSON body: { filename: string, data: string (base64) }
 * Stores the base64 data URL directly on the user record (no cloud needed for dev).
 */
async function uploadResume(req, res) {
  try {
    const { filename, data } = req.body;
    if (!data) return res.status(400).json({ error: 'No file data provided.' });

    // Validate it looks like a PDF data URL or base64
    const resumeUrl = data.startsWith('data:')
      ? data
      : `data:application/pdf;base64,${data}`;

    await prisma.user.update({
      where: { id: req.user.id },
      data: { resumeUrl },
    });

    return res.json({ data: { resumeUrl, filename: filename || 'resume.pdf' } });
  } catch (err) {
    console.error('[uploadResume]', err);
    return res.status(500).json({ error: 'Could not upload resume.' });
  }
}

module.exports = { getProfile, updateProfile, uploadResume, updateProfileValidators };
