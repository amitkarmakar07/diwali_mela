import { ZONES, PALETTE } from '../config/constants';

/** Wide, cheap fill so a zone reads as part of the mela instead of a dark island. */
function ZoneFill({
  at,
  height = 9,
  intensity = 85,
  distance = 44,
  color = PALETTE.warm,
}: {
  at: [number, number];
  height?: number;
  intensity?: number;
  distance?: number;
  color?: string;
}) {
  return (
    <pointLight
      position={[at[0], height, at[1]]}
      color={color}
      intensity={intensity}
      distance={distance}
      decay={1.6}
    />
  );
}

export function Lighting() {
  return (
    <>
      <ambientLight color="#5a5a8c" intensity={1.05} />
      {/* Warm bounce from the ground keeps the fairground floor readable at night. */}
      <hemisphereLight color="#2b3570" groundColor="#9c6a3c" intensity={1.25} />
      <directionalLight color="#aac4ff" intensity={0.9} position={[30, 45, 20]} />

      {/* The ride zone and the courtyard sit far off the lit promenade, so without these
          they fall into near-darkness. Decay is softened so one light covers the area. */}
      <ZoneFill at={ZONES.rideZone} height={12} intensity={120} distance={52} />
      <ZoneFill at={ZONES.swingBoat} height={10} intensity={105} distance={40} />
      <ZoneFill at={ZONES.carousel} height={9} intensity={85} distance={34} />
      <ZoneFill at={ZONES.courtyard} height={10} intensity={110} distance={46} color={PALETTE.warmBright} />
    </>
  );
}
