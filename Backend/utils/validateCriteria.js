// Criteria validation for ECOS voice exams: every stored criterion must have
// a non-empty label and at least one non-blank keyword (keyword-less criteria
// can never pass grading, so they are rejected instead of stored silently).
// Fully-empty rows (no label AND no keywords, e.g. the form's blank appended
// row) are stripped silently before validation.

// Returns { questions, errors }. `questions` is a cleaned copy (trimmed,
// empties stripped); `errors` lists blocking violations with question context.
export function cleanAndValidateQuestions(questions) {
  const errors = [];
  const cleaned = (questions || []).map((q, qi) => {
    const src = q && typeof q === 'object' ? q : {};
    const criteria = (src.criteria || [])
      .filter((c) => ((c?.label || '').trim() || (c?.keywords || []).some((k) => (k || '').trim())))
      .map((c) => ({
        label: (c.label || '').trim(),
        keywords: (c.keywords || []).map((k) => (k || '').trim()).filter(Boolean),
      }));
    criteria.forEach((c, ci) => {
      if (!c.label) errors.push(`Question ${qi + 1}, criterion ${ci + 1} needs a label`);
      if (c.keywords.length === 0) {
        errors.push(`Question ${qi + 1}, criterion "${c.label || `#${ci + 1}`}" needs at least one keyword`);
      }
    });
    return { ...src, criteria };
  });
  return { questions: cleaned, errors };
}
