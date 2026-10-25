import { Ground } from './Ground';
import { Lighting } from './Lighting';
import { Boundaries } from './Boundaries';
import { EntranceZone } from '../zones/entrance/EntranceZone';
import { PromenadeZone } from '../zones/promenade/PromenadeZone';
import { FerrisWheel } from '../zones/rideZone/FerrisWheel';
import { Carousel } from '../zones/rideZone/Carousel';
import { SwingBoat } from '../zones/rideZone/SwingBoat';
import { CourtyardZone } from '../zones/celebrationCourtyard/CourtyardZone';
import { FoodStreetZone } from '../zones/foodStreet/FoodStreetZone';
import { FunZone } from '../zones/funZone/FunZone';
import { MovieZone } from '../zones/movieZone/MovieZone';
import { CulturalStageZone } from '../zones/culturalStage/CulturalStageZone';
import { NPC } from '../npc/NPC';
import { npcWalkers, npcIdlers } from '../npc/npcPaths';

export function World() {
  return (
    <>
      <Lighting />
      <Ground />
      <Boundaries />

      <EntranceZone />
      <PromenadeZone />
      <FerrisWheel />
      <Carousel />
      <SwingBoat />
      <CourtyardZone />
      <FoodStreetZone />
      <FunZone />
      <MovieZone />
      <CulturalStageZone />

      {npcWalkers.map((w, i) => (
        <NPC
          key={`w${i}`}
          mode="walk"
          waypoints={w.waypoints}
          speed={w.speed}
          color={w.color}
          startT={w.startT}
          prop={w.prop}
          dwellTimes={w.dwellTimes}
        />
      ))}
      {npcIdlers.map((n, i) => (
        <NPC
          key={`i${i}`}
          mode="idle"
          position={n.position}
          color={n.color}
          facing={n.facing}
          prop={n.prop}
          reactsToSky={n.reactsToSky}
        />
      ))}
    </>
  );
}
