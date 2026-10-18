import { defineConfig } from 'astro/config';

// compressHTML off: the storyboard terminals rely on pre-wrap newlines.
export default defineConfig({ site: 'https://rm1338.github.io', compressHTML: false });
