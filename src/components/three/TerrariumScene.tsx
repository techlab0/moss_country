'use client';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, MeshTransmissionMaterial, Sparkles } from '@react-three/drei';
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import {
  backOut,
  clamp,
  createRng,
  easeOutCubic,
  generateInstances,
  lerp,
  noise3,
  smoothstep,
  type InstanceDatum,
  type MoundConfig,
} from './terrariumUtils';

export interface ProgressRef {
  value: number;
}

interface TerrariumSceneProps {
  progressRef: React.MutableRefObject<ProgressRef>;
  isMobile: boolean;
}

const GLASS_RADIUS = 1.6;
const MOUND: MoundConfig = {
  centerY: -0.72,
  radiusX: 1.22,
  radiusY: 0.72,
  radiusZ: 1.22,
  spread: 0.5,
};

const SOIL_DARK = ['#2b1a10', '#3c2415', '#4a2e1a'];
const MOSS_LIGHT = new THREE.Color('#8aa860');
const MOSS_DARK = new THREE.Color('#2d5a34');
const ROCK_COLORS = ['#6b6a63', '#8a8178', '#5c534a', '#746a5e'];
const SPROUT_COLOR = new THREE.Color('#7fbf5a');

const dummy = new THREE.Object3D();

/* ---------------------------------------------------------------------- */
/* カメラ・ポインタ視差リグ                                                */
/* ---------------------------------------------------------------------- */

function CameraRig({ progressRef, isMobile }: TerrariumSceneProps) {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, -0.15, 0));

  useFrame((_state, delta) => {
    const progress = progressRef.current.value;

    let dist = lerp(7.4, 4.35, smoothstep(0, 0.15, progress));
    dist = lerp(dist, 5.6, smoothstep(0.9, 1.0, progress));

    const baseY = lerp(1.05, 0.55, smoothstep(0, 0.3, progress));

    const px = isMobile ? 0 : pointer.x;
    const py = isMobile ? 0 : pointer.y;
    const parallax = THREE.MathUtils.degToRad(2);
    const angleY = px * parallax;
    const angleX = py * parallax;

    const desiredX = Math.sin(angleY) * dist;
    const desiredZ = Math.cos(angleY) * Math.cos(angleX) * dist;
    const desiredY = baseY + Math.sin(angleX) * dist * 0.25;

    const damp = 1 - Math.pow(0.001, delta);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredX, damp);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredY, damp);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredZ, damp);
    camera.lookAt(target.current);
  });

  return null;
}

/* ---------------------------------------------------------------------- */
/* ガラス容器 + 台座                                                       */
/* ---------------------------------------------------------------------- */

function GlassContainer({ progressRef, isMobile }: TerrariumSceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const progress = progressRef.current.value;
    const reveal = smoothstep(0, 0.15, progress);
    if (groupRef.current) {
      const scale = lerp(0.92, 1, reveal);
      groupRef.current.scale.setScalar(scale);
      groupRef.current.position.y = lerp(-0.35, 0, reveal);
    }
  });

  return (
    <group ref={groupRef}>
      {/* 上部が開いた球体ガラス容器 */}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[GLASS_RADIUS, 64, 64, 0, Math.PI * 2, 0.5, Math.PI - 0.5]} />
        <MeshTransmissionMaterial
          thickness={0.6}
          roughness={0.04}
          ior={1.5}
          chromaticAberration={0.03}
          samples={isMobile ? 4 : 8}
          resolution={isMobile ? 256 : 512}
          transmission={1}
          anisotropy={0.2}
          distortion={0}
          temporalDistortion={0}
          color="#f2fff6"
        />
      </mesh>
      {/* 台座 */}
      <mesh position={[0, -GLASS_RADIUS - 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[1.15, 1.35, 0.4, 48]} />
        <meshStandardMaterial color="#0e0c0a" roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, -GLASS_RADIUS - 0.27, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.35, 0.14, 48]} />
        <meshStandardMaterial color="#080706" roughness={0.6} metalness={0.05} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/* 土マウンド + 土の粒                                                     */
/* ---------------------------------------------------------------------- */

function SoilMound({ progressRef }: Pick<TerrariumSceneProps, 'progressRef'>) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = noise3(v.x * 1.8, v.y * 1.8, v.z * 1.8, 3);
      const scale = 1 + n * 0.14;
      v.multiplyScalar(scale);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    geo.scale(MOUND.radiusX, MOUND.radiusY, MOUND.radiusZ);
    geo.rotateX(Math.PI);
    return geo;
  }, []);

  useFrame(() => {
    const progress = progressRef.current.value;
    const rise = smoothstep(0.15, 0.35, progress);
    if (meshRef.current) {
      meshRef.current.scale.setScalar(Math.max(0.001, rise));
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, MOUND.centerY, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#3a2417" roughness={1} flatShading />
    </mesh>
  );
}

function SoilGrains({ progressRef, isMobile }: TerrariumSceneProps) {
  const count = isMobile ? 300 : 600;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const instances = useMemo<InstanceDatum[]>(
    () =>
      generateInstances(count, 101, MOUND, {
        scaleMin: 0.035,
        scaleMax: 0.085,
        dropMin: 1.4,
        dropMax: 3.2,
        durationMin: 0.25,
        durationMax: 0.4,
      }),
    [count]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const rng = createRng(202);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const shade = SOIL_DARK[Math.floor(rng() * SOIL_DARK.length) % SOIL_DARK.length];
      color.set(shade).offsetHSL(0, 0, (rng() - 0.5) * 0.08);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const progress = progressRef.current.value;
    const stage = smoothstep(0.15, 0.35, progress);

    for (let i = 0; i < count; i++) {
      const inst = instances[i];
      const t = smoothstep(inst.delay, inst.delay + inst.duration, stage);
      const scale = Math.max(0.0001, inst.baseScale * t);
      const y = inst.position[1] + inst.dropOffset * (1 - easeOutCubic(t));

      dummy.position.set(inst.position[0], y, inst.position[2]);
      dummy.rotation.set(0, inst.spinY, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} flatShading vertexColors />
    </instancedMesh>
  );
}

/* ---------------------------------------------------------------------- */
/* 岩                                                                      */
/* ---------------------------------------------------------------------- */

function Rocks({ progressRef }: Pick<TerrariumSceneProps, 'progressRef'>) {
  const rockCount = 5;
  const groupRef = useRef<THREE.Group>(null);

  const rocks = useMemo(() => {
    const rng = createRng(303);
    return Array.from({ length: rockCount }).map((_, i) => {
      const theta = rng() * Math.PI * 2;
      const phi = Math.pow(rng(), 0.7) * Math.PI * 0.46;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      const radius = 0.16 + rng() * 0.1;

      const geo = new THREE.IcosahedronGeometry(radius, 1);
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      for (let j = 0; j < pos.count; j++) {
        v.fromBufferAttribute(pos, j);
        const n = noise3(v.x * 6 + i * 10, v.y * 6, v.z * 6, i + 5);
        v.multiplyScalar(1 + n * 0.22);
        pos.setXYZ(j, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();

      const px = nx * MOUND.radiusX * 0.92;
      const py = MOUND.centerY + ny * MOUND.radiusY * 0.95;
      const pz = nz * MOUND.radiusZ * 0.92;

      const delay = (i / rockCount) * 0.5 + rng() * 0.15;

      return {
        geo,
        color: ROCK_COLORS[i % ROCK_COLORS.length],
        finalPos: new THREE.Vector3(px, py, pz),
        dropHeight: 1.2 + rng() * 0.8,
        spin: rng() * Math.PI * 2,
        delay,
      };
    });
  }, []);

  useFrame(() => {
    const progress = progressRef.current.value;
    const stage = smoothstep(0.35, 0.5, progress);
    const group = groupRef.current;
    if (!group) return;

    rocks.forEach((rock, i) => {
      const child = group.children[i];
      if (!child) return;
      const duration = 0.45;
      const t = clamp((stage - rock.delay) / duration, 0, 1);
      const scaleT = backOut(t, 1.5);
      const posT = easeOutCubic(t);

      child.position.set(
        rock.finalPos.x,
        rock.finalPos.y + rock.dropHeight * (1 - posT),
        rock.finalPos.z
      );
      child.scale.setScalar(Math.max(0.0001, scaleT));
    });
  });

  return (
    <group ref={groupRef}>
      {rocks.map((rock, i) => (
        <mesh key={i} geometry={rock.geo} rotation={[rock.spin * 0.4, rock.spin, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={rock.color} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/* 苔クランプ + 新芽                                                       */
/* ---------------------------------------------------------------------- */

function MossClumps({ progressRef, isMobile }: TerrariumSceneProps) {
  const count = isMobile ? 500 : 1200;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 7, 5);
    geo.scale(1, 0.52, 1);
    return geo;
  }, []);

  const instances = useMemo<InstanceDatum[]>(
    () =>
      generateInstances(count, 404, MOUND, {
        scaleMin: 0.09,
        scaleMax: 0.22,
        durationMin: 0.35,
        durationMax: 0.6,
      }),
    [count]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      color.copy(MOSS_LIGHT).lerp(MOSS_DARK, instances[i].colorT);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, instances]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const progress = progressRef.current.value;
    const stage = smoothstep(0.5, 0.75, progress);

    for (let i = 0; i < count; i++) {
      const inst = instances[i];
      const t = smoothstep(inst.delay, inst.delay + inst.duration, stage);
      const scale = Math.max(0.0001, inst.baseScale * t);

      dummy.position.set(inst.position[0], inst.position[1] + 0.02, inst.position[2]);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3(inst.normal[0], inst.normal[1], inst.normal[2]);
      dummy.quaternion.setFromUnitVectors(up, normal);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      dummy.rotateY(inst.spinY);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.85} flatShading vertexColors />
    </instancedMesh>
  );
}

function Sprouts({ progressRef, isMobile }: TerrariumSceneProps) {
  const count = isMobile ? 800 : 2500;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => new THREE.ConeGeometry(0.014, 0.09, 5), []);

  const instances = useMemo<InstanceDatum[]>(
    () =>
      generateInstances(count, 505, MOUND, {
        scaleMin: 0.6,
        scaleMax: 1.3,
        durationMin: 0.3,
        durationMax: 0.5,
      }),
    [count]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      color.copy(SPROUT_COLOR).offsetHSL(0, 0, (instances[i].colorT - 0.5) * 0.15);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, instances]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const progress = progressRef.current.value;
    const stage = smoothstep(0.6, 0.85, progress);

    for (let i = 0; i < count; i++) {
      const inst = instances[i];
      const t = smoothstep(inst.delay, inst.delay + inst.duration, stage);
      const scale = Math.max(0.0001, inst.baseScale * t);

      dummy.position.set(
        inst.position[0] + inst.normal[0] * 0.03,
        inst.position[1] + inst.normal[1] * 0.03 + 0.05 * scale,
        inst.position[2] + inst.normal[2] * 0.03
      );
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3(inst.normal[0], inst.normal[1], inst.normal[2]);
      dummy.quaternion.setFromUnitVectors(up, normal);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial roughness={0.7} flatShading vertexColors />
    </instancedMesh>
  );
}

/* ---------------------------------------------------------------------- */
/* ライティング・空気感                                                    */
/* ---------------------------------------------------------------------- */

function Atmosphere({ progressRef, isMobile }: TerrariumSceneProps) {
  const rimRef = useRef<THREE.SpotLight>(null);
  const sparklesRef = useRef<THREE.Points>(null);
  const { scene } = useThree();

  const sparkleCount = 40;
  const baseOpacities = useMemo(() => {
    const rng = createRng(909);
    return Array.from({ length: sparkleCount }, () => 0.12 + rng() * 0.18);
  }, []);

  useFrame(() => {
    const progress = progressRef.current.value;
    const boost = smoothstep(0.75, 0.9, progress);

    if (rimRef.current) {
      rimRef.current.intensity = lerp(0.6, 2.2, boost);
    }

    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.near = lerp(6, 4.4, boost);
      scene.fog.far = lerp(16, 12.5, boost);
    }

    const points = sparklesRef.current;
    if (points) {
      const attr = points.geometry.attributes.opacity as THREE.BufferAttribute | undefined;
      if (attr) {
        for (let i = 0; i < sparkleCount; i++) {
          attr.setX(i, baseOpacities[i] * lerp(1, 2.2, boost));
        }
        attr.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.18} color="#dfe9df" />
      <spotLight
        position={[2.2, 4.5, 1.5]}
        angle={0.4}
        penumbra={0.6}
        intensity={1.4}
        color="#ffdca8"
        castShadow={!isMobile}
      />
      <spotLight ref={rimRef} position={[-2.5, 1.2, -3]} angle={0.6} penumbra={1} intensity={0.6} color="#5fae7a" />
      <Sparkles
        ref={sparklesRef as unknown as React.Ref<THREE.Points>}
        count={sparkleCount}
        scale={[3.2, 2.4, 3.2]}
        size={2}
        speed={0.2}
        color="#cfe8d2"
        position={[0, 0.4, 0]}
      />
      <Environment preset="city" />
      <ContactShadows
        position={[0, -GLASS_RADIUS - 0.48, 0]}
        opacity={0.55}
        scale={5}
        blur={2.4}
        far={2}
      />
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* 常時ゆっくり自転するルート                                              */
/* ---------------------------------------------------------------------- */

function TerrariumRoot(props: TerrariumSceneProps) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (rootRef.current) {
      rootRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group ref={rootRef}>
      <GlassContainer {...props} />
      <SoilMound progressRef={props.progressRef} />
      <SoilGrains {...props} />
      <Rocks progressRef={props.progressRef} />
      <MossClumps {...props} />
      <Sprouts {...props} />
    </group>
  );
}

function SceneContents(props: TerrariumSceneProps) {
  const { scene } = useThree();

  useLayoutEffect(() => {
    scene.fog = new THREE.Fog('#0c0f0d', 6, 16);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  return (
    <>
      <CameraRig {...props} />
      <TerrariumRoot {...props} />
      <Atmosphere {...props} />
      <EffectComposer multisampling={props.isMobile ? 0 : 4}>
        {[
          <Bloom key="bloom" intensity={0.25} luminanceThreshold={0.7} mipmapBlur />,
          ...(props.isMobile
            ? []
            : [<DepthOfField key="dof" focusDistance={0.02} focalLength={0.05} bokehScale={2} />]),
          <Vignette key="vignette" darkness={0.55} eskil={false} />,
        ]}
      </EffectComposer>
    </>
  );
}

export function TerrariumScene({ progressRef, isMobile }: TerrariumSceneProps) {
  return (
    <Canvas
      dpr={isMobile ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 35, position: [0, 1.05, 7.4] }}
    >
      <color attach="background" args={['#0c0f0d']} />
      <React.Suspense fallback={null}>
        <SceneContents progressRef={progressRef} isMobile={isMobile} />
      </React.Suspense>
    </Canvas>
  );
}
