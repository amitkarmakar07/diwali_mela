export function Lighting() {
  return (
    <>
      <ambientLight color="#5a5a8c" intensity={0.95} />
      {/* Warm bounce from the ground keeps the fairground floor readable at night. */}
      <hemisphereLight color="#2b3570" groundColor="#9c6a3c" intensity={1.15} />
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
