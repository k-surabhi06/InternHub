const { body } = require('express-validator');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const prisma = require('../utils/prismaClient');

// ─── Cloudinary config ────────────────────────────────────────────────────────
// Credentials come from env vars — set them in Render dashboard / local .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Multer: keep file in memory, stream it to Cloudinary ────────────────────
// We do NOT save to local disk — Render's filesystem is ephemeral (wiped on deploy).
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted.'));
    }
  },
});

// Export the middleware for use in the route
const uploadMiddleware = upload.single('file');

// ─── Validation ───────────────────────────────────────────────────────────────
const uploadValidators = [
  body('label').trim().notEmpty().withMessage('label is required.'),
];

// ─── Helper: stream a Buffer to Cloudinary ───────────────────────────────────
function streamToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id:     publicId,
        resource_type: 'raw',          // required for non-image files (PDFs)
        format:        'pdf',          // tells Cloudinary to treat it as PDF
        folder:        'internhub/resumes',
        overwrite:     true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /api/resumes
 * multipart/form-data: file (PDF, ≤5 MB) + label (string)
 */
async function uploadResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A PDF file is required.' });
    }

    const label = req.body.label?.trim();
    if (!label) {
      return res.status(400).json({ error: 'label is required.' });
    }

    // Check Cloudinary is configured — fail fast with a clear message
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.error('[uploadResume] Cloudinary env vars not set.');
      return res.status(500).json({ error: 'File storage is not configured on this server.' });
    }

    // Unique public_id: userId + timestamp (no path separators)
    const publicId = `${req.user.id}_${Date.now()}`;

    let cloudResult;
    try {
      cloudResult = await streamToCloudinary(req.file.buffer, publicId);
    } catch (err) {
      console.error('[uploadResume] Cloudinary upload error:', err.message);
      return res.status(500).json({ error: 'Failed to upload file to storage.' });
    }

    const resume = await prisma.resume.create({
      data: {
        userId:      req.user.id,
        label,
        fileUrl:     cloudResult.secure_url,
        fileName:    req.file.originalname,
        cloudinaryId: cloudResult.public_id,
      },
    });

    return res.status(201).json({ data: resume });
  } catch (err) {
    console.error('[uploadResume]', err);
    return res.status(500).json({ error: 'Failed to save resume.' });
  }
}

/**
 * GET /api/resumes
 */
async function listResumes(req, res) {
  try {
    const resumes = await prisma.resume.findMany({
      where:   { userId: req.user.id },
      orderBy: { uploadedAt: 'desc' },
      select:  { id: true, label: true, fileName: true, fileUrl: true, uploadedAt: true },
    });
    return res.json({ data: resumes });
  } catch (err) {
    console.error('[listResumes]', err);
    return res.status(500).json({ error: 'Failed to fetch resumes.' });
  }
}

/**
 * DELETE /api/resumes/:id
 */
async function deleteResume(req, res) {
  try {
    const { id } = req.params;

    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) return res.status(404).json({ error: 'Resume not found.' });
    if (resume.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });

    // Delete from Cloudinary first (best-effort — don't block DB delete if it fails)
    if (resume.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(resume.cloudinaryId, { resource_type: 'raw' });
      } catch (cloudErr) {
        console.warn('[deleteResume] Cloudinary delete failed (continuing):', cloudErr.message);
      }
    }

    // DB delete — SavedInternship.resumeId nullified via onDelete: SetNull
    await prisma.resume.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    console.error('[deleteResume]', err);
    return res.status(500).json({ error: 'Failed to delete resume.' });
  }
}

module.exports = { uploadResume, listResumes, deleteResume, uploadMiddleware, uploadValidators };
