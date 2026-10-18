import { existsSync } from 'node:fs';

/** Résumé links render only once public/resume.pdf exists, so the live site never links to a missing file. */
export const hasResume = existsSync('public/resume.pdf');
