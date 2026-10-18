import Crewbo from './Crewbo.astro';
import Gremlin from './Gremlin.astro';
import Scribe from './Scribe.astro';

/** The 3D figure for each project, keyed by content id. */
export const figures = { crewbo: Crewbo, gremlin: Gremlin, scribe: Scribe } as const;
