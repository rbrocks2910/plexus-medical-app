/**
 * @file db.ts
 * @description This file handles loading the disease databases using fs.readFileSync
 * for compatibility with Vercel serverless functions.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Loads and caches all disease database JSON files.
 * Uses fs.readFileSync for Vercel compatibility instead of import assertions.
 * @returns The combined disease database.
 */
export const loadAllDiseaseDBs = (): Record<string, { name: string; rarity: string }[]> => {
  try {
    // Get the directory of the current file for more reliable path resolution in serverless environments
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Construct path relative to this file
    const filePath = join(__dirname, '../_db/diseases.json');

    // Verify file exists before attempting to read
    if (!existsSync(filePath)) {
      console.error(`Disease database file not found at path: ${filePath}`);
      return {};
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading disease database:', error);
    return {};
  }
};