import express from 'express';
import { param } from 'express-validator';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import Module from '../models/moduleModel.js';
import { requireAdmin } from '../controllers/authController.js';
import { cacheMiddleware, delPattern } from '../utils/cache.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import path from 'path';

const router = express.Router();

const normalizeCourses = (mod) => {
  if (!mod.courses) return mod;
  mod.courses = mod.courses.map((c) => {
    if (typeof c === 'string') return { name: c, pdfId: '' };
    if (c && typeof c === 'object' && !c.name && c.pdfId === undefined) return { name: '', pdfId: '' };
    return c;
  });
  return mod;
};
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = path.extname(file.originalname).toLowerCase();
    if (allowedExt === '.csv' && (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel')) cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
});

// GET all modules (optionally filter by year) — cached 5 min
router.get('/modules', cacheMiddleware(), catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.year)       filter.year       = Number(req.query.year);
  if (req.query.discipline) filter.discipline = String(req.query.discipline);
  let modules = await Module.find(filter).sort({ year: 1, name: 1 });
  modules = modules.map(normalizeCourses);
  res.json(modules);
}));

// POST create module
router.post('/modules', requireAdmin, catchAsync(async (req, res) => {
  const { name, year, courses, discipline } = req.body;
  if (!name || !year) return res.status(400).json({ message: 'name and year are required' });
  let module = await Module.create({ name, year, discipline: discipline || 'medicine', courses: courses || [] });
  delPattern('GET:/api/modules');
  res.status(201).json(normalizeCourses(module));
}));

// PUT update module
router.put('/modules/:id', requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const { name, year, courses, discipline } = req.body;
  const updates = { name, year, courses: courses || [] };
  if (discipline) updates.discipline = discipline;
  let updated = await Module.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ message: 'Module not found' });
  delPattern('GET:/api/modules');
  res.json(normalizeCourses(updated));
}));

// DELETE module
router.delete('/modules/:id', requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const deleted = await Module.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Module not found' });
  delPattern('GET:/api/modules');
  res.json({ message: 'Module deleted successfully' });
}));

// POST /api/import-modules-csv
router.post('/import-modules-csv', requireAdmin, upload.single('file'), catchAsync(async (req, res) => {
  let filePath;
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
    filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    try { fs.unlinkSync(filePath); } catch { logger.warn('Failed to cleanup temp CSV file'); }

    const records = parse(content, { columns: true, skip_empty_lines: true });

    if (records.length === 0) return res.status(400).json({ message: 'CSV is empty' });

    const results = { created: 0, skipped: [], errors: [] };

    for (const row of records) {
      try {
        const name = row.name?.trim();
        const year = Number(row.year);
        const discipline = row.discipline?.trim() || 'medicine';
        if (!name || !year) { results.errors.push(`Row missing name or year`); continue; }

        const existing = await Module.findOne({ name, year, discipline });
        if (existing) { results.skipped.push(name); continue; }

        const courses = row.courses ? row.courses.split('|').map((c) => c.trim()).filter(Boolean).map((name) => ({ name, pdfId: '' })) : [];

        await Module.create({ name, year, discipline, courses });
        results.created++;
      } catch (e) {
        results.errors.push(`Row "${row.name}": import error`);
      }
    }

    res.status(201).json({
      message: `Import complete: ${results.created} created, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      ...results,
    });
  } catch (err) {
    logger.error({ err }, 'Module CSV import failed');
    if (filePath) try { fs.unlinkSync(filePath); } catch { logger.warn('Failed to cleanup temp CSV file on error'); }
    res.status(500).json({ message: 'Import failed' });
  }
}));

export default router;
