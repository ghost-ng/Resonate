#!/usr/bin/env node
/**
 * Downloads whisper.cpp CLI binary and base.en model for Windows x64.
 * Run: node scripts/download-whisper.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WHISPER_DIR = path.join(__dirname, '..', 'resources', 'whisper');
const MODELS_DIR = path.join(WHISPER_DIR, 'models');

// whisper.cpp release — update these when upgrading
const WHISPER_VERSION = 'v1.7.5';
const WHISPER_ZIP_URL = `https://github.com/ggerganov/whisper.cpp/releases/download/${WHISPER_VERSION}/whisper-${WHISPER_VERSION}-bin-x64.zip`;
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    const file = fs.createWriteStream(dest);
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Resonate' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100);
            process.stdout.write(`\r  ${pct}% (${(downloaded / 1048576).toFixed(1)} MB)`);
          }
        });
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(' Done');
          resolve();
        });
      }).on('error', reject);
    };
    get(url);
  });
}

async function main() {
  // Ensure directories
  fs.mkdirSync(WHISPER_DIR, { recursive: true });
  fs.mkdirSync(MODELS_DIR, { recursive: true });

  // Download whisper CLI binary
  const exePath = path.join(WHISPER_DIR, 'whisper-cli.exe');
  if (fs.existsSync(exePath)) {
    console.log('whisper-cli.exe already exists, skipping.');
  } else {
    const zipPath = path.join(WHISPER_DIR, 'whisper-bin.zip');
    await download(WHISPER_ZIP_URL, zipPath);
    console.log('Extracting whisper-cli.exe...');
    try {
      // Use PowerShell to extract on Windows
      execSync(`powershell -Command "Expand-Archive -Force '${zipPath}' '${WHISPER_DIR}'"`, { stdio: 'inherit' });
      // Find whisper-cli.exe in extracted contents
      const findExe = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = findExe(full);
            if (found) return found;
          } else if (entry.name === 'whisper-cli.exe') {
            return full;
          }
        }
        return null;
      };
      const found = findExe(WHISPER_DIR);
      if (found && found !== exePath) {
        fs.copyFileSync(found, exePath);
        console.log(`Copied ${found} -> ${exePath}`);
      }
    } catch (e) {
      console.error('Extraction failed:', e.message);
    }
    // Clean up zip
    try { fs.unlinkSync(zipPath); } catch { }
  }

  // Download model
  const modelPath = path.join(MODELS_DIR, 'ggml-base.en.bin');
  if (fs.existsSync(modelPath)) {
    console.log('ggml-base.en.bin already exists, skipping.');
  } else {
    await download(MODEL_URL, modelPath);
  }

  console.log('\nWhisper setup complete.');
  console.log(`  Binary: ${exePath} (${fs.existsSync(exePath) ? 'OK' : 'MISSING'})`);
  console.log(`  Model:  ${modelPath} (${fs.existsSync(modelPath) ? 'OK' : 'MISSING'})`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
