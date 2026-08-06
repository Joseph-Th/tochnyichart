'use strict';

const fs = require('node:fs');

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const MAX_EOCD_SEARCH = 22 + 0xffff;

function zipEntryNamesFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Presentation file must be read as a Buffer.');
  let eocdOffset = -1;
  const searchStart = Math.max(0, buffer.length - MAX_EOCD_SEARCH);
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('Presentation is not a readable ZIP-based PowerPoint file.');

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const names = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('Presentation ZIP central directory is malformed.');
    }
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > buffer.length) throw new Error('Presentation ZIP entry name is truncated.');
    names.push(buffer.toString('utf8', nameStart, nameEnd));
    offset = nameEnd + extraLength + commentLength;
  }
  return names;
}

function countPresentationSlides(pptxPath) {
  if (!fs.existsSync(pptxPath)) throw new Error(`PowerPoint presentation is missing: ${pptxPath}`);
  const names = zipEntryNamesFromBuffer(fs.readFileSync(pptxPath));
  return names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).length;
}

function validatePresentationFile(pptxPath, plan) {
  const expected = Number(plan?.expectedSlideCount);
  if (!Number.isInteger(expected) || expected < 1) {
    throw new Error('presentation-plan.json must declare a positive expectedSlideCount.');
  }
  if (plan?.titleSlidesAllowed !== false) {
    throw new Error('presentation-plan.json must set titleSlidesAllowed to false for the default chart deck.');
  }
  const actual = countPresentationSlides(pptxPath);
  if (actual !== expected) {
    throw new Error(
      `PowerPoint slide count is ${actual}, but presentation-plan.json requires exactly ${expected} chart slides. ` +
      'Remove unrequested cover, title, agenda, divider, closing, or other non-chart slides and preserve every accepted chart.'
    );
  }
  return {
    valid: true,
    pptxPath,
    expectedSlideCount: expected,
    actualSlideCount: actual,
    titleSlidesAllowed: false
  };
}

module.exports = {
  zipEntryNamesFromBuffer,
  countPresentationSlides,
  validatePresentationFile
};
