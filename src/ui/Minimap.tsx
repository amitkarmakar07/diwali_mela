import { useEffect, useMemo, useRef } from 'react';
import { useGame } from '../core/GameState';
import { playerPosition, playerLook } from '../player/playerRef';
import { WORLD, ZONES, FOOD_STREET, PALETTE } from '../config/constants';
import './minimap.css';

const RAD2DEG = 180 / Math.PI;

// Promenade's north-south span isn't a shared constant (AGENT.md §3: z = 40 -> -14).
const PROMENADE_SOUTH_Z = 52; // player spawn, south gate end of the visible path
const PROMENADE_NORTH_Z = -40; // roughly the ride zone's latitude, north end

const MAP_ZONES: { key: string; label: string; x: number; z: number; color: string }[] = [
  { key: 'entrance', label: 'Entrance', x: ZONES.entrance[0], z: ZONES.entrance[1], color: PALETTE.gold },
  { key: 'promenade', label: 'Promenade', x: ZONES.promenade[0], z: ZONES.promenade[1], color: PALETTE.warm },
  { key: 'plaza', label: 'Plaza', x: ZONES.plaza[0], z: ZONES.plaza[1], color: PALETTE.marigold },
  { key: 'rideZone', label: 'Ferris Wheel', x: ZONES.rideZone[0], z: ZONES.rideZone[1], color: '#4db5ff' },
  { key: 'carousel', label: 'Carousel', x: ZONES.carousel[0], z: ZONES.carousel[1], color: '#d88bff' },
  { key: 'swingBoat', label: 'Swing Boat', x: ZONES.swingBoat[0], z: ZONES.swingBoat[1], color: PALETTE.teal },
  { key: 'foodStreet', label: 'Food Street', x: ZONES.foodStreet[0], z: ZONES.foodStreet[1], color: PALETTE.deepRed },
  { key: 'funZone', label: 'Fun Zone', x: ZONES.funZone[0], z: ZONES.funZone[1], color: '#4dff88' },
  { key: 'culturalStage', label: 'Cultural Stage', x: ZONES.culturalStage[0], z: ZONES.culturalStage[1], color: PALETTE.warmBright },
  { key: 'courtyard', label: 'Courtyard', x: ZONES.courtyard[0], z: ZONES.courtyard[1], color: PALETTE.magenta },
];

/** World metres -> percentage position inside the minimap box. North (-Z, "into the mela") is up. */
function worldToPct(x: number, z: number) {
  const left = ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * 100;
  const top = ((z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ)) * 100;
  return { left, top };
}

export function Minimap() {
  const started = useGame((s) => s.started);
  const mode = useGame((s) => s.mode);

  const markerRef = useRef<HTMLDivElement>(null);
  const wedgeRef = useRef<HTMLDivElement>(null);

  const visible = started && mode !== 'paused';

  const zoneMarkers = useMemo(
    () => MAP_ZONES.map((z) => ({ ...z, ...worldToPct(z.x, z.z) })),
    [],
  );

  const promenadeRect = useMemo(() => {
    const north = worldToPct(0, PROMENADE_NORTH_Z).top;
    const south = worldToPct(0, PROMENADE_SOUTH_Z).top;
    return { top: north, height: south - north };
  }, []);

  const foodLane = useMemo(() => {
    const [fx, , fzCenter] = FOOD_STREET.position;
    const north = worldToPct(fx, fzCenter - FOOD_STREET.laneHalfLength).top;
    const south = worldToPct(fx, fzCenter + FOOD_STREET.laneHalfLength).top;
    const left = worldToPct(fx, fzCenter).left;
    const link = worldToPct(fx, FOOD_STREET.linkZ).top;
    const linkLeft = worldToPct(fx, FOOD_STREET.linkZ).left;
    const linkRight = worldToPct(0, FOOD_STREET.linkZ).left;
    return { top: north, height: south - north, left, link, linkLeft, linkRight };
  }, []);

  // DOM lives outside the R3F Canvas, so useFrame isn't available here — drive the
  // per-frame position/heading update with our own rAF loop and mutate style directly
  // (no React state) to avoid a re-render every frame.
  useEffect(() => {
    if (!visible) return;

    let frame = 0;
    const tick = () => {
      const { left, top } = worldToPct(playerPosition.x, playerPosition.z);
      const marker = markerRef.current;
      if (marker) {
        marker.style.left = `${left}%`;
        marker.style.top = `${top}%`;
      }
      const wedge = wedgeRef.current;
      if (wedge) {
        wedge.style.transform = `rotate(${-playerLook.yaw * RAD2DEG}deg)`;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="minimap-root">
      <div className="minimap-box">
        <div
          className="minimap-path minimap-promenade"
          style={{ top: `${promenadeRect.top}%`, height: `${promenadeRect.height}%` }}
        />
        <div
          className="minimap-path minimap-food-lane"
          style={{ top: `${foodLane.top}%`, height: `${foodLane.height}%`, left: `${foodLane.left}%` }}
        />
        <div
          className="minimap-path minimap-food-link"
          style={{
            top: `${foodLane.link}%`,
            left: `${foodLane.linkLeft}%`,
            width: `${foodLane.linkRight - foodLane.linkLeft}%`,
          }}
        />

        {zoneMarkers.map((zone) => (
          <div
            key={zone.key}
            className="minimap-zone"
            style={{
              left: `${zone.left}%`,
              top: `${zone.top}%`,
              backgroundColor: zone.color,
              color: zone.color,
            }}
          />
        ))}

        <div ref={markerRef} className="minimap-player">
          <div ref={wedgeRef} className="minimap-player-wedge" />
        </div>
      </div>
      <div className="minimap-caption">Mela Map</div>
    </div>
  );
}
