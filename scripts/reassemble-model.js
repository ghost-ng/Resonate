#!/usr/bin/env node
/**
 * Reassembles the split whisper model parts into the full .bin file.
 * The model is split into <50MB chunks to stay under GitHub's file size limit.
 * Run: node scripts/reassemble-model.js
 */
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'resources', 'whisper', 'models');
const OUTPUT = path.join(MODELS_DIR, 'ggml-base.en.bin');
const PARTS_PREFIX = 'ggml-base.en.bin.part_';

if (fs.existsSync(OUTPUT)) {
  console.log('[Model] ggml-base.en.bin already exists, skipping reassembly.');
  process.exit(0);
}

const parts = fs.readdirSync(MODELS_DIR)
  .filter(f => f.startsWith(PARTS_PREFIX))
  .sort();

if (parts.length === 0) {
  console.error('[Model] No split parts found in', MODELS_DIR);
  process.exit(1);
}

console.log(`[Model] Reassembling ${parts.length} parts into ggml-base.en.bin...`);
const out = fs.openSync(OUTPUT, 'w');
for (const part of parts) {
  const data = fs.readFileSync(path.join(MODELS_DIR, part));
  fs.writeSync(out, data);
  console.log(`  + ${part} (${(data.length / 1048576).toFixed(1)} MB)`);
}
fs.closeSync(out);

const size = fs.statSync(OUTPUT).size;
console.log(`[Model] Done: ${(size / 1048576).toFixed(1)} MB`);
