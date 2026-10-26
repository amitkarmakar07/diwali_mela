import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import type { Group } from 'three';
import { ZONES, PALETTE } from '../../config/constants';
import { useGame } from '../../core/GameState';
import type { ShopItem } from '../../core/GameState';
import { Interactable } from '../../interaction/Interactable';
import { LampPost, StringLights, Banner, Bunting, DressingStall } from '../../world/Decor';

const [plazaX, plazaZ] = ZONES.plaza;
const PROMENADE_X = 8.5;
const LAMP_ZS = Array.from({ length: 7 }, (_, i) => 40 - i * 9);
// Pennants hang between the lamp spans so the overhead view is never empty.
const BUNTING_ZS = LAMP_ZS.slice(0, -1).map((z) => z - 4.5);
const STALL_X = 10.5;

const SIGN_TARGETS = [
  { label: 'Ride Zone', x: ZONES.rideZone[0], z: ZONES.rideZone[1] },
  { label: 'Celebration Courtyard', x: ZONES.courtyard[0], z: ZONES.courtyard[1] },
  { label: 'Food Street', x: ZONES.foodStreet[0], z: ZONES.foodStreet[1] },
  { label: 'Cultural Stage', x: ZONES.culturalStage[0], z: ZONES.culturalStage[1] },
  { label: 'Fun Zone', x: ZONES.funZone[0], z: ZONES.funZone[1] },
];

interface StallSpec {
  x: number;
  z: number;
  color: string;
  rotation: number;
  name: string;
  id: string;
  label: string;
  subtitle: string;
  items: ShopItem[];
  audio?: string;
}

const STALL_SPECS: StallSpec[] = [
  {
    x: -STALL_X,
    z: 33,
    color: PALETTE.marigold,
    rotation: -Math.PI / 2,
    name: 'Sharma Ji Ki Chaat',
    id: 'shop-chaat',
    label: 'Browse Sharma Ji Ki Chaat',
    subtitle: 'Tangy, spicy, and served right now!',
    items: [
      { name: 'Bhel Puri', price: 30, note: 'Puffed rice, tamarind chutney' },
      { name: 'Dahi Puri', price: 35, note: 'Topped with cool yoghurt' },
      { name: 'Papdi Chaat', price: 35 },
      { name: 'Aloo Tikki Chaat', price: 40, note: 'Crisp potato patties, two chutneys' },
    ],
    audio: '/audio/chat_centre.mp3',
  },
  {
    x: STALL_X,
    z: 24,
    color: PALETTE.teal,
    rotation: Math.PI / 2,
    name: 'Mathur Achar Wale',
    id: 'shop-achar',
    label: 'Browse Mathur Achar Wale',
    subtitle: 'Sun-pickled, family recipe, three generations strong.',
    items: [
      { name: 'Mango Pickle (Aam Achar)', price: 80 },
      { name: 'Mixed Vegetable Pickle', price: 70 },
      { name: 'Lemon Pickle (Nimbu Achar)', price: 60 },
      { name: 'Garlic Pickle (Lehsun Achar)', price: 75 },
    ],
    audio: '/audio/aachar.mp3',
  },
  {
    x: -STALL_X,
    z: 15,
    color: PALETTE.magenta,
    rotation: -Math.PI / 2,
    name: 'Khilone Ki Dukaan',
    id: 'shop-toys-promenade',
    label: 'Browse the Khilone Ki Dukaan',
    subtitle: 'Hand-painted wooden toys for the little ones.',
    items: [
      { name: 'Spinning Top (Lattu)', price: 25 },
      { name: 'Wooden Rattle', price: 45 },
      { name: 'Toy Drum (Dholak)', price: 90, note: 'Hand-painted, kid-sized' },
      { name: 'Kite (Patang)', price: 20, note: 'Comes with a reel of string' },
    ],
    audio: '/audio/khilona_store.mp3',
  },
  {
    x: STALL_X,
    z: 6,
    color: PALETTE.deepRed,
    rotation: Math.PI / 2,
    name: 'Agarwal Mithai Bhandar',
    id: 'shop-mithai',
    label: 'Browse Agarwal Mithai Bhandar',
    subtitle: 'Fresh mithai, boxed for gifting or eating right here.',
    items: [
      { name: 'Besan Laddoo', price: 35 },
      { name: 'Kaju Katli', price: 70, note: 'Pure cashew, silver leaf on top' },
      { name: 'Soan Papdi', price: 40 },
      { name: 'Rasgulla', price: 45, note: 'Soft, spongy, served chilled' },
    ],
    audio: '/audio/mithai_store.mp3',
  },
  {
    x: -STALL_X,
    z: -3,
    color: PALETTE.gold,
    rotation: -Math.PI / 2,
    name: 'Verma Masala Store',
    id: 'shop-masala',
    label: 'Browse Verma Masala Store',
    subtitle: 'Fresh-ground spices, weighed while you wait.',
    items: [
      { name: 'Garam Masala (100g)', price: 55 },
      { name: 'Turmeric Powder (100g)', price: 40 },
      { name: 'Red Chilli Powder (100g)', price: 45 },
      { name: 'Chai Masala (50g)', price: 35, note: 'Cardamom, clove, ginger blend' },
    ],
  },
  {
    x: STALL_X,
    z: -11,
    color: PALETTE.marigold,
    rotation: Math.PI / 2,
    name: 'Ganesh Jewellers',
    id: 'shop-jewellery',
    label: 'Browse Ganesh Jewellers',
    subtitle: 'Festival jewellery — bring the sparkle home.',
    items: [
      { name: 'Gold-Plated Jhumki', price: 180 },
      { name: 'Kundan Necklace Set', price: 350, note: 'Matching earrings included' },
      { name: 'Maang Tikka', price: 150 },
      { name: 'Silver Anklet Pair', price: 200 },
    ],
    audio: '/audio/jewellery_store.mp3',
  },
];

const BENCH_SPECS: Array<[number, number]> = [
  [7, -26],
  [-7, -26],
  [7, -14],
  [-7, -14],
];

export function PromenadeZone() {
  const bannerGroup = useRef<Group>(null);

  useFrame((state) => {
    if (bannerGroup.current) {
      bannerGroup.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.1) * 0.025;
    }
  });

  return (
    <group>
      {LAMP_ZS.map((z, i) => (
        <group key={z}>
          <LampPost position={[-PROMENADE_X, 0, z]} height={5} light={i % 2 === 0} />
          <LampPost position={[PROMENADE_X, 0, z]} height={5} light={i % 2 === 1} />
        </group>
      ))}

      {LAMP_ZS.map((z) => (
        <StringLights key={z} from={[-PROMENADE_X, 5, z]} to={[PROMENADE_X, 5, z]} count={12} sag={1.4} />
      ))}

      {BUNTING_ZS.map((z) => (
        <Bunting key={z} from={[-PROMENADE_X, 5.5, z]} to={[PROMENADE_X, 5.5, z]} count={15} sag={1.2} />
      ))}

      {STALL_SPECS.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.rotation, 0]}>
          <DressingStall position={[0, 0, 0]} color={s.color} variant={i} name={s.name} />
          <Interactable
            id={s.id}
            position={[0, 1.2, 0]}
            radius={3}
            label={s.label}
            onInteract={() =>
              useGame.getState().openPanel({
                type: 'shop',
                title: s.name,
                subtitle: s.subtitle,
                items: s.items,
                audio: s.audio,
              })
            }
          />
        </group>
      ))}

      <group ref={bannerGroup}>
        <Banner position={[-PROMENADE_X, 4.2, 31]} rotation={[0, 0, 0]} width={3} />
        <Banner position={[PROMENADE_X, 4.2, 13]} rotation={[0, 0, 0]} width={3} />
        <Banner position={[-PROMENADE_X, 4.2, -5]} rotation={[0, 0, 0]} width={3} />
      </group>

      <group position={[plazaX, 0, plazaZ]}>
        <RigidBody type="fixed" colliders={false}>
          <CylinderCollider args={[0.55, 3.2]} position={[0, 0.55, 0]} />
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <cylinderGeometry args={[3.2, 3.4, 0.4, 28]} />
            <meshStandardMaterial color={PALETTE.ground} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[2.5, 2.9, 0.35, 28]} />
            <meshStandardMaterial color={PALETTE.path} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.88, 0]}>
            <cylinderGeometry args={[1.8, 2.2, 0.3, 24]} />
            <meshStandardMaterial color={PALETTE.deepRed} roughness={0.7} />
          </mesh>
        </RigidBody>

        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[1.5, 1.9, 0.55, 20]} />
          <meshStandardMaterial
            color={PALETTE.gold}
            emissive={PALETTE.warm}
            emissiveIntensity={0.5}
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <torusGeometry args={[1.55, 0.14, 8, 32]} />
          <meshStandardMaterial color={PALETTE.marigold} emissive={PALETTE.marigold} emissiveIntensity={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.1, 0]}>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshStandardMaterial
            color={PALETTE.flame}
            emissive={PALETTE.flame}
            emissiveIntensity={1.1}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 2.85, 0]}>
          <coneGeometry args={[0.32, 0.9, 10]} />
          <meshStandardMaterial
            color={PALETTE.warmBright}
            emissive={PALETTE.warmBright}
            emissiveIntensity={1.4}
            roughness={0.2}
          />
        </mesh>

        <pointLight position={[0, 2.6, 0]} color={PALETTE.warm} intensity={60} distance={22} decay={2} />

        <group position={[-8, 0, -5]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.18, 2.8, 8]} />
            <meshStandardMaterial color="#473a52" roughness={0.6} />
          </mesh>
          {SIGN_TARGETS.map((t, i) => {
            const dx = t.x - (plazaX - 8);
            const dz = t.z - (plazaZ - 5);
            const angle = Math.atan2(dx, dz);
            return (
              <group key={t.label} position={[0, 2.6 - i * 0.55, 0]} rotation={[0, angle, 0]}>
                <mesh position={[0, 0, 0.5]}>
                  <boxGeometry args={[0.55, 0.4, 1.4]} />
                  <meshStandardMaterial color={PALETTE.teal} roughness={0.7} />
                </mesh>
                {/* The pole sits at local z=0 and the reader stands right there looking outward
                    (+Z, after the group's rotation) toward this panel — the far side from where
                    drei <Text> faces by default, so it rendered mirrored like the stall signs. */}
                <Text
                  position={[0, 0, 1.22]}
                  rotation={[0, Math.PI, 0]}
                  font="/fonts/Mukta-Bold.ttf"
                  fontSize={0.24}
                  color={PALETTE.warmBright}
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={1.2}
                >
                  {t.label}
                </Text>
              </group>
            );
          })}
        </group>

        {BENCH_SPECS.map(([x, z]) => (
          <RigidBody key={`${x}-${z}`} type="fixed" colliders={false} position={[x, 0, z]}>
            <CuboidCollider args={[0.9, 0.25, 0.4]} position={[0, 0.45, 0]} />
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[1.8, 0.1, 0.5]} />
              <meshStandardMaterial color="#5b4a3e" roughness={0.8} />
            </mesh>
            {[-0.75, 0.75].map((lx) => (
              <mesh key={lx} position={[lx, 0.2, 0]}>
                <boxGeometry args={[0.12, 0.4, 0.45]} />
                <meshStandardMaterial color="#3a2f28" roughness={0.9} />
              </mesh>
            ))}
          </RigidBody>
        ))}
      </group>
    </group>
  );
}
