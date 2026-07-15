import Quiz from '../models/quizModel.js';
import Module from '../models/moduleModel.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { genQuizId } from '../utils/idGenerator.js';

export const bulkPublish = catchAsync(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
  await Quiz.updateMany({ _id: { $in: ids } }, { $set: { published: true } });
  res.json({ message: `${ids.length} quiz publiés` });
});

export const bulkUnpublish = catchAsync(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
  await Quiz.updateMany({ _id: { $in: ids } }, { $set: { published: false } });
  res.json({ message: `${ids.length} quiz dépubliés` });
});

export const bulkDelete = catchAsync(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
  const result = await Quiz.deleteMany({ _id: { $in: ids } });
  res.json({ message: `${result.deletedCount} quiz supprimés` });
});

export const importQuizzesCsv = catchAsync(async (req, res) => {
  let filePath;
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
    filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    try { fs.unlinkSync(filePath); } catch { logger.warn('Failed to cleanup temp CSV file'); }

    const records = parse(content, { columns: true, skip_empty_lines: true });

    if (records.length === 0) return res.status(400).json({ message: 'CSV is empty' });

    const results = { created: 0, skipped: [], errors: [] };

    const moduleKeys = [...new Set(records.map((r) => `${r.discipline?.trim()}|${r.moduleName?.trim()}|${Number(r.year)}`))];
    const modules = await Module.find({ $or: moduleKeys.map((k) => {
      const [discipline, name, year] = k.split('|');
      return { discipline, name, year: Number(year) };
    }) });
    const moduleMap = {};
    modules.forEach((m) => { moduleMap[`${m.discipline}|${m.name}|${m.year}`] = m; });

    const quizIds = records.map((r) => r.quizId?.trim()).filter(Boolean);
    const existingQuizzes = await Quiz.find({ quizId: { $in: quizIds } }, { quizId: 1 });
    const existingMap = {};
    existingQuizzes.forEach((q) => { existingMap[q.quizId] = true; });

    for (const row of records) {
      try {
        const discipline = row.discipline?.trim();
        if (!discipline) { results.errors.push(`Row "${row.quizId || '?'}": missing discipline column`); continue; }

        const key = `${discipline}|${row.moduleName?.trim()}|${Number(row.year)}`;
        const module = moduleMap[key];
        if (!module) { results.errors.push(`Row "${row.quizId || '?'}": module "${row.moduleName}" year ${row.year} discipline ${discipline} not found`); continue; }

        const csvQuizId = row.quizId?.trim();
        if (csvQuizId) {
          if (existingMap[csvQuizId]) { results.skipped.push(csvQuizId); continue; }
        }
        const quizId = csvQuizId || await genQuizId();

        await Quiz.create({
          quizId,
          quizName: row.quizName?.trim() || '',
          moduleId: module._id,
          year: module.year,
          discipline: module.discipline,
          question: {
            questionText: row.questionText.trim(),
            options: row.options.split('|').map((o) => o.trim()),
            correctAnswers: row.correctAnswers.split('|').map((a) => a.trim()),
          },
        });
        results.created++;
      } catch (e) {
        results.errors.push(`Row "${row.quizId}": import error`);
      }
    }

    res.status(201).json({
      message: `Import complete: ${results.created} created, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      ...results,
    });
  } catch (err) {
    logger.error({ err }, 'Quiz CSV import failed');
    if (filePath) try { fs.unlinkSync(filePath); } catch { logger.warn('Failed to cleanup temp CSV file on error'); }
    res.status(500).json({ message: 'Import failed' });
  }
});
