#!/usr/bin/env node

import { readFile, writeFile, copyFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve the repository root from the script's location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = __dirname;

// Helper function to recursively copy directories
async function copyDir(src: string, dest: string) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src);
  
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    
    const stats = await stat(srcPath);
    if (stats.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

// Helper function to validate trophies file
async function validateTrophies() {
  const trophiesPath = join(repoRoot, 'app', 'data', 'trophies.json');
  try {
    const trophiesData = await readFile(trophiesPath, 'utf8');
    const trophies = JSON.parse(trophiesData);
    
    if (!trophies.trophies || trophies.trophies.length < 55) {
      throw new Error('Not enough trophies in the trophies file');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Invalid trophies file: ${error.message}`);
  }
}

// Main function
async function main() {
  // Validate required files
  const indexPath = join(repoRoot, 'app', 'index.html');
  const trophiesPath = join(repoRoot, 'app', 'data', 'trophies.json');
  
  try {
    await stat(indexPath);
    await stat(trophiesPath);
  } catch (error) {
    throw new Error('Required files missing: index.html or trophies.json');
  }
  
  // Validate trophies file
  await validateTrophies();
  
  // Get output directory
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  
  // Copy app/ directory
  const appDest = join(outputDir, 'app');
  await copyDir(join(repoRoot, 'app'), appDest);
  
  // Copy screenshots/ directory
  const screenshotsSrc = join(repoRoot, 'screenshots');
  try {
    await stat(screenshotsSrc);
    const screenshotsDest = join(outputDir, 'screenshots');
    await copyDir(screenshotsSrc, screenshotsDest);
  } catch (error) {
    // screenshots directory might not exist, which is fine
  }
  
  // Import buildDossier function
  const { buildDossier } = await import('./vendor/makefun-frontend.ts');
  
  // Build dossier
  const dossier = await buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: {
      max: 4,
      max_bytes: 262144
    },
    app_max_files: 993,
    app_max_bytes: 50331648
  });
  
  // Write dossier.json
  const dossierPath = join(outputDir, 'dossier.json');
  await writeFile(dossierPath, dossier);
  
  console.log('Build completed successfully');
}

// Run main function and handle errors
main().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});