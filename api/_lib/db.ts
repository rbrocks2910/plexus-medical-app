/**
 * @file db.ts
 * @description This file handles loading the disease databases by directly importing them,
 * making them part of the serverless function bundle.
 */
import diseaseDB from '../_db/diseases.json' with { type: 'json' };

/**
 * Loads and caches all disease database JSON files.
 * This is now a synchronous function as the JSON files are bundled at build time.
 * @returns The combined disease database.
 */
export const loadAllDiseaseDBs = (): Record<string, { name: string; rarity: string }[]> => {
    // The import is handled by the bundler, so we can just return the imported object.
    // This is more efficient and reliable than fetching files at runtime.
    return diseaseDB;
};