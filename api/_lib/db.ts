/**
 * @file db.ts
 * @description This file handles loading the disease databases using fs.readFileSync
 * for compatibility with Vercel serverless functions.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Loads and caches all disease database JSON files.
 * Uses fs.readFileSync for Vercel compatibility instead of import assertions.
 * @returns The combined disease database.
 */
export const loadAllDiseaseDBs = (): Record<string, { name: string; rarity: string }[]> => {
  try {
    // In Vercel serverless functions, files are available relative to the function
    const filePath = join(process.cwd(), 'api/_db/diseases.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading disease database:', error);
    return {};
  }
};