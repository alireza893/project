import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, Suspense } from 'react'
import * as THREE from 'three'

/**
 * 3D background: a black-and-white engineering grid.
 * Deliberately colorless and without soft blobs, matching the app's formal theme.
 */

/** A perspective grid plane drifting slowly toward the viewer */
function GridPlane({ z = 0, opacity = 0.5, speed = 0.35, divisions = 60, size = 90 }) {
  const ref = useRef()
  useFrame((state, dt) => {
    if (!ref.current) return
    // Continuous grid motion, wrapping every unit so it looks endless
    ref.current.position.z = ((state.clock.elapsedTime * speed) % (size / divisions)) + z
  })
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(size, divisions, '#2b3140', '#39404f')
    g.material.transparent = true
    g.material.opacity = opacity
    g.material.depthWrite = false
    return g
  }, [size, divisions, opacity])
  return <primitive ref={ref} object={grid} position={[0, -3.2, z]} />
}

/** Thin vertical lines, giving a sense of structure and system */
function VerticalRails({ count = 22, height = 12, spread = 34 }) {
  const ref = useRef()
  const geo = useMemo(() => {
    const pts = []
    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1) - 0.5) * spread
      const zz = -6 - (i % 5) * 3
      pts.push(x, -3.2, zz, x, -3.2 + height * (0.25 + ((i * 37) % 100) / 160), zz)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [count, height, spread])

  useFrame((state) => {
    if (ref.current) ref.current.material.opacity = 0.18 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
  })

  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#39404f" transparent opacity={0.2} depthWrite={false} />
    </lineSegments>
  )
}

/** Small data points scattered over the grid */
function Nodes({ count = 150 }) {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30
      arr[i * 3 + 1] = -3 + Math.random() * 7
      arr[i * 3 + 2] = -Math.random() * 16
    }
    return arr
  }, [count])
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.012
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#4a5162" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  )
}

export default function Scene3D() {
  return (
    <div className="fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, #f7f8fa, #eceef2 55%, #e6e8ed)' }}
      />
      <Canvas
        camera={{ position: [0, 0.8, 9], fov: 55 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#eceef2', 9, 26]} />
          <GridPlane z={-2} opacity={0.55} speed={0.5} />
          <GridPlane z={-14} opacity={0.3} speed={0.32} divisions={40} size={110} />
          <VerticalRails />
          <Nodes />
        </Suspense>
      </Canvas>
      {/* Fade the edges so the content stays readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(247,248,250,0) 30%, rgba(243,244,247,.72) 78%),' +
            'linear-gradient(to bottom, rgba(247,248,250,.5), transparent 22%, transparent 74%, rgba(240,241,245,.72))',
        }}
      />
    </div>
  )
}
