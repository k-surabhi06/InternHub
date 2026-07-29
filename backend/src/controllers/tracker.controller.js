const { body } = require('express-validator');
const prisma = require('../utils/prismaClient');
const { InternshipStatus } = require('@prisma/client');

// ─── Validation chains ────────────────────────────────────────────────────────

const saveValidators = [
  body('internshipId').notEmpty().withMessage('internshipId is required.'),
];

const updateValidators = [
  body('status')
    .optional()
    .isIn(Object.values(InternshipStatus))
    .withMessage(`status must be one of: ${Object.values(InternshipStatus).join(', ')}`),
  body('notes').optional().isString().withMessage('notes must be a string.'),
  body('resumeId').optional({ nullable: true }).isString().withMessage('resumeId must be a string.'),
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/tracker — save an internship to the logged-in user's tracker
 */
async function saveInternship(req, res) {
  try {
    const { internshipId } = req.body;
    const userId = req.user.id;

    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
    if (!internship) return res.status(404).json({ error: 'Internship not found.' });

    const saved = await prisma.savedInternship.upsert({
      where: { userId_internshipId: { userId, internshipId } },
      create: { userId, internshipId },
      update: {},
      include: { internship: true },
    });

    // Record initial status history entry if this is a new save
    const historyCount = await prisma.statusHistory.count({
      where: { savedInternshipId: saved.id },
    });
    if (historyCount === 0) {
      await prisma.statusHistory.create({
        data: { savedInternshipId: saved.id, status: saved.status },
      });
    }

    return res.status(201).json({ data: saved });
  } catch (err) {
    console.error('[saveInternship]', err);
    return res.status(500).json({ error: 'Failed to save internship.' });
  }
}

/**
 * GET /api/tracker — get all saved internships for the logged-in user
 * Optional query param: ?status=Applied
 */
async function getTracker(req, res) {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = {
      userId,
      ...(status && { status }),
    };

    const items = await prisma.savedInternship.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        internship: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            stipend: true,
            duration: true,
            applyUrl: true,
            source: true,
            isActive: true,
            deadline: true,
          },
        },
        history: {
          orderBy: { changedAt: 'asc' },
          select: { id: true, status: true, changedAt: true, note: true },
        },
        resume: {
          select: { id: true, label: true, fileName: true, fileUrl: true },
        },
      },
    });

    return res.json({ data: items });
  } catch (err) {
    console.error('[getTracker]', err);
    return res.status(500).json({ error: 'Failed to fetch tracker.' });
  }
}

/**
 * PATCH /api/tracker/:id — update status and/or notes
 */
async function updateTrackerItem(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status, notes, resumeId } = req.body;

    const existing = await prisma.savedInternship.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Tracker item not found.' });
    if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden.' });

    // Ownership check on resumeId — must belong to this user, or be null (detach)
    if (resumeId !== undefined && resumeId !== null) {
      const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
      if (!resume) return res.status(404).json({ error: 'Resume not found.' });
      if (resume.userId !== userId) return res.status(403).json({ error: 'Forbidden — resume belongs to another user.' });
    }

    const updated = await prisma.savedInternship.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(resumeId !== undefined && { resumeId: resumeId ?? null }),
      },
      include: {
        internship: true,
        history: { orderBy: { changedAt: 'asc' } },
        resume: { select: { id: true, label: true, fileName: true, fileUrl: true } },
      },
    });

    // Record status change in history if status changed
    if (status !== undefined && status !== existing.status) {
      await prisma.statusHistory.create({
        data: { savedInternshipId: id, status },
      });
    }

    return res.json({ data: updated });
  } catch (err) {
    console.error('[updateTrackerItem]', err);
    return res.status(500).json({ error: 'Failed to update tracker item.' });
  }
}

/**
 * DELETE /api/tracker/:id — remove a saved internship from tracker
 */
async function deleteTrackerItem(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.savedInternship.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Tracker item not found.' });
    if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden.' });

    await prisma.savedInternship.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('[deleteTrackerItem]', err);
    return res.status(500).json({ error: 'Failed to delete tracker item.' });
  }
}

/**
 * GET /api/tracker/stats — return status breakdown counts for the logged-in user
 */
async function getTrackerStats(req, res) {
  try {
    const userId = req.user.id;
    const counts = await prisma.savedInternship.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });
    const stats = {};
    counts.forEach((c) => { stats[c.status] = c._count.status; });
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return res.json({ data: { total, byStatus: stats } });
  } catch (err) {
    console.error('[getTrackerStats]', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
}

module.exports = {
  saveInternship,
  getTracker,
  updateTrackerItem,
  deleteTrackerItem,
  getTrackerStats,
  saveValidators,
  updateValidators,
};
