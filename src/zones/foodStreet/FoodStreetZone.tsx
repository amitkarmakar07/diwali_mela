import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { FOOD_STREET, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import {
  LampPost,
  StringLights,
  Banner,
  Bunting,
  DressingStall,
  CandyAwning,
  Garland,
  ClothSkirt,
  GlowBackdrop,
  Vendor,
} from '../../world/Decor';

const { laneHalfLength, laneWidth, stallOffset, linkZ, position } = FOOD_STREET;
const LOCAL_LINK_Z = linkZ - position[2];
const BRANCH_FAR_X = -7 - position[0];
const LANE_EDGE_X = laneWidth / 2;

const WOOD = '#4a3a30';
const WOOD_DARK = '#2f2621';
const METAL = '#3a3240';
const CLOTH_A = '#7a3b2e';
const CLOTH_B = '#2e5c52';

function SteamPuffs({ position: pos, count = 3 }: { position: [number, number, number]; count?: number }) {
  const refs = useRef<(Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const mesh = refs.current[i];
      if (!mesh) continue;
      const loopT = ((t * 0.35 + i / count) % 1 + 1) % 1;
      mesh.position.y = pos[1] + loopT * 1.1;
      mesh.position.x = pos[0] + Math.sin(loopT * Math.PI * 2 + i) * 0.1;
      const fade = Math.sin(loopT * Math.PI);
      const scale = 0.18 + loopT * 0.3;
      mesh.scale.setScalar(scale);
      const mat = mesh.material as MeshStandardMaterial;
      mat.opacity = fade * 0.35;
    }
  });

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={pos} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Pinwheel({ position: pos, color, phase = 0 }: { position: [number, number, number]; color: string; phase?: number }) {
  const spin = useRef<Group>(null);
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.z += delta * (1.6 + phase);
  });
  return (
    <group position={pos}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1, 6]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>
      <group ref={spin} position={[0, 1, 0]}>
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((a, i) => (
          <mesh key={i} rotation={[0, 0, a]} position={[0.14, 0.14, 0]}>
            <coneGeometry args={[0.1, 0.22, 4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function BalloonCluster({ position: pos, colors }: { position: [number, number, number]; colors: string[] }) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.position.y = pos[1] + Math.sin(state.clock.elapsedTime * 1.4) * 0.08;
  });
  return (
    <group ref={group} position={pos}>
      {colors.map((c, i) => {
        const x = (i - (colors.length - 1) / 2) * 0.28;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.16, 10, 10]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.32, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 0.5, 4]} />
              <meshStandardMaterial color={WOOD_DARK} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function BangleStack({ position: pos, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={pos}>
      {[0, 0.09, 0.18, 0.27].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1, 0.018, 6, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function HangingLantern({ position: pos, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.5, 4]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.16, 0.18, 0.3, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <coneGeometry args={[0.1, 0.16, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

function StallFrame({
  color,
  awningColor,
  name,
}: {
  color: string;
  awningColor: string;
  name: string;
}) {
  const counterSize: [number, number, number] = [2.8, 1.0, 1.1];
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[counterSize[0] / 2, counterSize[1] / 2, counterSize[2] / 2]} position={[0, counterSize[1] / 2, 0]} />
        <mesh position={[0, counterSize[1] / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={counterSize} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </RigidBody>
      {[
        [-1.3, -0.45],
        [1.3, -0.45],
        [-1.3, 0.45],
        [1.3, 0.45],
      ].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, 1.1, cz]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 2.2, 6]} />
          <meshStandardMaterial color={METAL} roughness={0.7} />
        </mesh>
      ))}

      {/* Candy-striped awning over the counter — stripes always deep red/cream per the reference; awningColor flavours the trim strip under its lip instead. */}
      <CandyAwning position={[0, 2.25, -0.2]} rotation={[Math.PI / 9, 0, 0]} width={3.2} depth={1.1} stripes={8} />
      <mesh position={[0, 2.46, 0.34]}>
        <boxGeometry args={[3.2, 0.08, 0.04]} />
        <meshStandardMaterial color={awningColor} emissive={awningColor} emissiveIntensity={0.3} roughness={0.7} />
      </mesh>

      {/* Illuminated signboard: deep maroon panel, gold border frame, warm bulb row along the awning edge. */}
      <mesh position={[0, 2.68, 0.335]}>
        <boxGeometry args={[3.1, 0.58, 0.05]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.25} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.68, 0.35]}>
        <boxGeometry args={[3.0, 0.5, 0.08]} />
        <meshStandardMaterial color={PALETTE.deepRed} roughness={0.85} />
      </mesh>
      <Text
        position={[0, 2.68, 0.4]}
        font="/fonts/Mukta-Bold.ttf"
        fontSize={0.22}
        color={PALETTE.warmBright}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.8}
      >
        {name}
      </Text>
      <StringLights from={[-1.5, 2.0, 0.42]} to={[1.5, 2.0, 0.42]} count={9} sag={0.08} />

      {/* Glowing striped backdrop behind the goods, on the far side from the counter front. */}
      {/* Set back past the vendor at z = -0.75. At the counter's back edge the lit panel
          stood in front of them and hid the shopkeeper, which read as a shuttered stall. */}
      <GlowBackdrop position={[0, 1.6, -1.25]} width={2.6} height={1.1} />

      {/* Patterned cloth skirt on the counter's front face, same side as the awning/sign. */}
      <ClothSkirt position={[0, 0.28, 0.58]} width={2.6} height={0.5} />

      {/* Marigold garland swagged along the counter's front lip, with brass bells at the dips. */}
      <Garland
        from={[-1.3, counterSize[1] + 0.08, 0.5]}
        to={[1.3, counterSize[1] + 0.08, 0.5]}
        count={10}
        sag={0.14}
        bellCount={3}
        swags={3}
      />
    </>
  );
}

function JalebiStall({ position: pos, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const laddoo = useRef<Mesh>(null);
  useFrame((state) => {
    if (laddoo.current) laddoo.current.rotation.y = state.clock.elapsedTime * 0.3;
  });
  return (
    <group position={pos} rotation={rotation}>
      <Interactable
        id="food-jalebi"
        position={[0, 1.2, 0]}
        radius={3}
        label="Browse the Jalebi & Sweets Stall"
        onInteract={() =>
          useGame.getState().openPanel({
            type: 'shop',
            title: 'Jalebi & Sweets',
            subtitle: 'Hot from the pan — mind your fingers!',
            items: [
              { name: 'Jalebi', price: 40, note: 'Crisp, syrup-soaked spirals' },
              { name: 'Motichoor Laddoo', price: 30 },
              { name: 'Kaju Barfi', price: 60, note: 'Cashew, cut in diamonds' },
              { name: 'Gulab Jamun', price: 35, note: 'Served warm, extra syrup on request' },
            ],
          })
        }
      />
      <StallFrame color={PALETTE.marigold} awningColor={PALETTE.gold} name="Lakshmi Sweets Bhandar" />
      <mesh position={[0, 1.08, 0.2]}>
        <cylinderGeometry args={[0.55, 0.6, 0.08, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, 1.14, 0.2 + Math.sin(a) * 0.22]} rotation={[Math.PI / 2, 0, a]}>
            <torusGeometry args={[0.1, 0.025, 6, 12]} />
            <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.6} roughness={0.3} />
          </mesh>
        );
      })}
      <group ref={laddoo} position={[-0.9, 1.08, -0.1]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[(i % 3) * 0.16 - 0.16, 0.08, Math.floor(i / 3) * 0.16 - 0.08]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={PALETTE.marigold} roughness={0.6} />
          </mesh>
        ))}
      </group>
      <group position={[0.9, 1.08, -0.1]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[(i % 3) * 0.14 - 0.14, 0.04, Math.floor(i / 3) * 0.14 - 0.07]}>
            <boxGeometry args={[0.1, 0.07, 0.1]} />
            <meshStandardMaterial color="#e8c99a" roughness={0.7} />
          </mesh>
        ))}
      </group>
      <Vendor position={[0, 0, -0.75]} shirt={CLOTH_A} phase={0.4} />
      <SteamPuffs position={[0, 1.2, 0.2]} />
    </group>
  );
}

function StreetFoodStall({ position: pos, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={pos} rotation={rotation}>
      <Interactable
        id="food-streetfood"
        position={[0, 1.2, 0]}
        radius={3}
        label="Order from the Street Food Stall"
        onInteract={() =>
          useGame.getState().openPanel({
            type: 'shop',
            title: 'Street Food Corner',
            subtitle: 'Garma-garam! Fresh off the tava, bhaiya!',
            items: [
              { name: 'Pani Puri', price: 30, note: 'Six puchkas, tangy water on the side' },
              { name: 'Steamed Momos', price: 50, note: 'With fiery red chutney' },
              { name: 'Masala Chai', price: 15 },
              { name: 'Pav Bhaji', price: 60, note: 'Extra butter, extra onion' },
            ],
          })
        }
      />
      <StallFrame color={PALETTE.teal} awningColor={PALETTE.deepRed} name="Bablu Ki Rasoi" />
      <mesh position={[-0.6, 1.1, 0.15]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.3, 12]} />
        <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.6, 1.32, 0.1]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.03, 0.04, 0.3, 6]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.3, 1.08, 0.15]}>
        <cylinderGeometry args={[0.45, 0.48, 0.06, 20]} />
        <meshStandardMaterial color="#1f1b1e" metalness={0.5} roughness={0.5} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.85, 1.04 + i * 0.08, -0.1]}>
          <cylinderGeometry args={[0.13, 0.13, 0.07, 10]} />
          <meshStandardMaterial color={PALETTE.warmBright} roughness={0.5} />
        </mesh>
      ))}
      <Vendor position={[0, 0, -0.75]} shirt={CLOTH_B} phase={1.6} />
      <SteamPuffs position={[-0.6, 1.3, 0.15]} />
      <SteamPuffs position={[0.3, 1.15, 0.15]} count={2} />
    </group>
  );
}

function ToyShop({ position: pos, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={pos} rotation={rotation}>
      <Interactable
        id="food-toys"
        position={[0, 1.2, 0]}
        radius={3}
        label="Browse the Toy Shop"
        onInteract={() =>
          useGame.getState().openPanel({
            type: 'shop',
            title: 'Mela Toy Shop',
            subtitle: 'Come, come! Something for every child tonight!',
            items: [
              { name: 'Pinwheel', price: 20, note: 'Spins in the night breeze' },
              { name: 'Stuffed Teddy', price: 150 },
              { name: 'Wind-up Toy Car', price: 80 },
              { name: 'Balloon Bunch', price: 25, note: 'Pick any three colours' },
            ],
          })
        }
      />
      <StallFrame color={PALETTE.magenta} awningColor={PALETTE.teal} name="Mela Khilone Ghar" />
      {[-0.9, -0.5, 0.5, 0.9].map((x, i) => (
        <mesh key={i} position={[x, 1.1, -0.1]}>
          <boxGeometry args={[0.22, 0.14, 0.4]} />
          <meshStandardMaterial color={PALETTE.bulbColors[i % PALETTE.bulbColors.length]} roughness={0.6} />
        </mesh>
      ))}
      {[-0.9, -0.5, 0.5, 0.9].map((x, i) => (
        <group key={`wheel-${i}`} position={[x, 1.02, -0.1]}>
          {[-0.08, 0.08].map((wz, j) => (
            <mesh key={j} position={[0, -0.08, wz]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.03, 8]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} position={[i === 0 ? -0.2 : 0.2, 1.1, 0.25]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshStandardMaterial color={PALETTE.bulbColors[(i + 2) % PALETTE.bulbColors.length]} roughness={0.7} />
        </mesh>
      ))}
      <Pinwheel position={[-1.1, 1.1, 0.35]} color={PALETTE.magenta} phase={0} />
      <Pinwheel position={[1.1, 1.1, 0.35]} color={PALETTE.teal} phase={0.4} />
      <BalloonCluster position={[0, 2.6, 0]} colors={PALETTE.bulbColors.slice(0, 5)} />
      <Vendor position={[0, 0, -0.75]} shirt={CLOTH_A} phase={2.3} />
    </group>
  );
}

function AccessoriesShop({ position: pos, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={pos} rotation={rotation}>
      <Interactable
        id="food-accessories"
        position={[0, 1.2, 0]}
        radius={3}
        label="Browse Accessories & Decorations"
        onInteract={() =>
          useGame.getState().openPanel({
            type: 'shop',
            title: 'Accessories & Decorations',
            subtitle: 'Sparkle for Diwali — bangles, jhumkas, diyas, all fresh stock!',
            items: [
              { name: 'Glass Bangles (set)', price: 90, note: 'Matched colours, six pieces' },
              { name: 'Jhumka Earrings', price: 120 },
              { name: 'Mini Hanging Lantern', price: 70, note: 'Battery tealight included' },
              { name: 'String of Clay Diyas', price: 50, note: '10 diyas on jute string' },
            ],
          })
        }
      />
      <StallFrame color={PALETTE.deepRed} awningColor={PALETTE.marigold} name="Rani Sajawat Bhandar" />
      <BangleStack position={[-1.0, 1.05, 0.1]} color={PALETTE.gold} />
      <BangleStack position={[-0.7, 1.05, 0.1]} color={PALETTE.magenta} />
      <BangleStack position={[-0.4, 1.05, 0.1]} color={PALETTE.teal} />
      {[0.3, 0.6, 0.9].map((x, i) => (
        <group key={i} position={[x, 1.5, 0.15]}>
          <mesh>
            <torusGeometry args={[0.05, 0.012, 6, 10]} />
            <meshStandardMaterial color={PALETTE.gold} metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshStandardMaterial color={PALETTE.bulbColors[i]} emissive={PALETTE.bulbColors[i]} emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
      <HangingLantern position={[-1.1, 2.1, 0.3]} color={PALETTE.marigold} />
      <HangingLantern position={[1.1, 2.1, 0.3]} color={PALETTE.teal} />
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-0.8 + i * 0.4, 1.95, 0.32]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={PALETTE.flame} emissive={PALETTE.flame} emissiveIntensity={1} />
        </mesh>
      ))}
      <Vendor position={[0, 0, -0.75]} shirt={CLOTH_B} phase={3.1} />
    </group>
  );
}

function SeatingArea({ position: pos }: { position: [number, number, number] }) {
  return (
    <group position={pos}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.55, 0.38, 0.55]} position={[0, 0.38, 0]} />
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.07, 1.1]} />
          <meshStandardMaterial color={WOOD} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.36, 6]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
      </RigidBody>
      {[
        [0, 0, -0.95],
        [0, 0, 0.95],
      ].map(([bx, , bz], i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={[bx, 0, bz]}>
          <CuboidCollider args={[0.75, 0.22, 0.26]} position={[0, 0.4, 0]} />
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[1.5, 0.08, 0.42]} />
            <meshStandardMaterial color={WOOD} roughness={0.85} />
          </mesh>
          {[-0.6, 0.6].map((lx) => (
            <mesh key={lx} position={[lx, 0.18, 0]}>
              <boxGeometry args={[0.1, 0.36, 0.38]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
            </mesh>
          ))}
        </RigidBody>
      ))}
    </group>
  );
}

const LAMP_ZS = [-12, -4, 4, 12];
const BUNTING_ZS = [-8, 0, 8];
const FILLER_SPECS: Array<[number, number, string, string]> = [
  [-LANE_EDGE_X - 1.3, -laneHalfLength + 1.2, PALETTE.deepRed, 'Khanna Achar Stall'],
  [LANE_EDGE_X + 1.3, -laneHalfLength + 1.2, PALETTE.teal, 'Choti Khilone Dukaan'],
  [-LANE_EDGE_X - 1.3, laneHalfLength - 4.2, PALETTE.marigold, 'Deepawali Mithai Corner'],
];

export function FoodStreetZone() {
  const bannerGroup = useRef<Group>(null);

  useFrame((state) => {
    if (bannerGroup.current) {
      bannerGroup.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.05) * 0.02;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[laneWidth, laneHalfLength * 2 + 4]} />
        <meshStandardMaterial color={PALETTE.path} roughness={0.9} />
      </mesh>

      <mesh
        position={[(LANE_EDGE_X + BRANCH_FAR_X) / 2, 0.02, LOCAL_LINK_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[BRANCH_FAR_X - LANE_EDGE_X, 3]} />
        <meshStandardMaterial color={PALETTE.path} roughness={0.9} />
      </mesh>

      {LAMP_ZS.map((z, i) => (
        <group key={z}>
          <LampPost position={[-LANE_EDGE_X + 0.4, 0, z]} height={4.6} light={i % 2 === 0} />
          <LampPost position={[LANE_EDGE_X - 0.4, 0, z]} height={4.6} light={i % 2 === 1} />
        </group>
      ))}
      {LAMP_ZS.map((z) => (
        <StringLights
          key={z}
          from={[-LANE_EDGE_X + 0.4, 4.6, z]}
          to={[LANE_EDGE_X - 0.4, 4.6, z]}
          count={10}
          sag={1.1}
        />
      ))}
      {BUNTING_ZS.map((z) => (
        <Bunting
          key={z}
          from={[-LANE_EDGE_X + 0.4, 5.1, z]}
          to={[LANE_EDGE_X - 0.4, 5.1, z]}
          count={11}
          sag={1.0}
        />
      ))}

      <group ref={bannerGroup}>
        <Banner position={[-LANE_EDGE_X + 0.4, 4, -8]} rotation={[0, 0, 0]} width={2.6} color={PALETTE.marigold} />
        <Banner position={[LANE_EDGE_X - 0.4, 4, 2]} rotation={[0, 0, 0]} width={2.6} color={PALETTE.teal} />
      </group>

      <JalebiStall position={[-stallOffset, 0, -10]} rotation={[0, Math.PI / 2, 0]} />
      <StreetFoodStall position={[stallOffset, 0, -4]} rotation={[0, -Math.PI / 2, 0]} />
      <ToyShop position={[-stallOffset, 0, 4]} rotation={[0, Math.PI / 2, 0]} />
      <AccessoriesShop position={[stallOffset, 0, 10]} rotation={[0, -Math.PI / 2, 0]} />

      {FILLER_SPECS.map(([x, z, color, name], i) => (
        <DressingStall
          key={i}
          position={[x, 0, z]}
          rotation={[0, i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          color={color}
          variant={i + 1}
          name={name}
        />
      ))}

      <SeatingArea position={[LANE_EDGE_X - 1.3, 0, laneHalfLength - 2]} />
    </group>
  );
}
