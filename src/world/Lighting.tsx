export function Lighting() {
  return (
    <>
      <ambientLight color="#4a5490" intensity={0.85} />
      <hemisphereLight color="#2b3570" groundColor="#6b4a2e" intensity={0.8} />
      <directionalLight
        color="#aac4ff"
        intensity={0.85}
        position={[30, 45, 20]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={150}
      />
    </>
  );
}
