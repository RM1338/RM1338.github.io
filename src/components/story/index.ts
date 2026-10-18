import CrewboStory from './CrewboStory.astro';
import GremlinStory from './GremlinStory.astro';
import ScribeStory from './ScribeStory.astro';
import CrewboSim from '../interactive/CrewboSim.astro';
import GremlinRun from '../interactive/GremlinRun.astro';
import ScribeFlow from '../interactive/ScribeFlow.astro';

/** Per project: the storyboard (chapters 01 to 06) and the hands-on demo. */
export const stories = {
  crewbo: { Story: CrewboStory, Try: CrewboSim },
  gremlin: { Story: GremlinStory, Try: GremlinRun },
  scribe: { Story: ScribeStory, Try: ScribeFlow },
} as const;
