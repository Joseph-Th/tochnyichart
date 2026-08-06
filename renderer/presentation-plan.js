'use strict';

const path = require('node:path');

function buildPresentationPlan(rows, runId) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('A presentation plan requires at least one accepted chart.');
  }
  const slides = rows.map((row, index) => ({
    slide: index + 1,
    kind: 'chart',
    slug: row.slug,
    title: row.title,
    image: path.basename(row.pngPath || row.png || `${row.slug}.png`)
  }));
  return {
    version: '1.0',
    runId,
    titleSlidesAllowed: false,
    expectedSlideCount: slides.length,
    slides
  };
}

function validatePresentationPlan(plan, rows) {
  const errors = [];
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return { valid: false, errors: ['Presentation plan must be an object.'] };
  }
  if (plan.version !== '1.0') errors.push('Presentation plan version must be 1.0.');
  if (plan.titleSlidesAllowed !== false) {
    errors.push('Presentation plan must set titleSlidesAllowed to false unless the user explicitly requested a title slide.');
  }
  if (!Array.isArray(plan.slides)) errors.push('Presentation plan slides must be an array.');

  const expectedRows = Array.isArray(rows) ? rows : [];
  const slides = Array.isArray(plan.slides) ? plan.slides : [];
  if (plan.expectedSlideCount !== expectedRows.length || slides.length !== expectedRows.length) {
    errors.push(`Presentation must contain exactly one slide per accepted chart (${expectedRows.length} slides).`);
  }

  slides.forEach((slide, index) => {
    const row = expectedRows[index];
    if (slide?.kind !== 'chart') errors.push(`slides[${index}].kind must be chart; unrequested cover, title, agenda, or divider slides are not allowed.`);
    if (slide?.slide !== index + 1) errors.push(`slides[${index}].slide must be ${index + 1}.`);
    if (!row) return;
    if (slide.slug !== row.slug) errors.push(`slides[${index}].slug must preserve chart order (${row.slug}).`);
    if (slide.title !== row.title) errors.push(`slides[${index}].title must match the accepted chart title.`);
    const expectedImage = path.basename(row.pngPath || row.png || `${row.slug}.png`);
    if (slide.image !== expectedImage) errors.push(`slides[${index}].image must use the final PNG ${expectedImage}.`);
  });

  return { valid: errors.length === 0, errors };
}

module.exports = {
  buildPresentationPlan,
  validatePresentationPlan
};
