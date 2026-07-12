'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import styles from './TerrariumExperience.module.css';

type TerrariumWebGLProps = {
  modelUrl: string;
  progressRef: MutableRefObject<number>;
};

type LoadState = 'loading' | 'ready' | 'error' | 'reduced-motion';

const disposeMaterial = (material: THREE.Material) => {
  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose();
  });
  material.dispose();
};

export function TerrariumWebGL({ modelUrl, progressRef }: TerrariumWebGLProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      setLoadState('reduced-motion');
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: window.devicePixelRatio <= 1.5,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.setClearColor(0x010201, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.05, 100);
    camera.position.set(0, 0.26, 7.1);
    camera.lookAt(0, 0.12, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environment = environment;

    scene.add(new THREE.HemisphereLight(0xdbe8c4, 0x11150e, 0.82));
    const key = new THREE.DirectionalLight(0xe8f2d5, 2.25);
    key.position.set(-3.5, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x77955c, 1.35);
    rim.position.set(4, 2.5, -3);
    scene.add(rim);
    const warm = new THREE.PointLight(0xf0c68c, 0.75, 12, 1.7);
    warm.position.set(2.6, -1.2, 3.2);
    scene.add(warm);

    const modelPivot = new THREE.Group();
    scene.add(modelPivot);
    let modelRoot: THREE.Object3D | undefined;
    let baseScale = 1;
    let frameId = 0;
    let renderedProgress = progressRef.current;
    let disposed = false;

    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    draco.setDecoderConfig({ type: 'wasm' });
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    const replacedMaterials = new Set<THREE.Material>();
    const webMaterials = {
      drainage: new THREE.MeshStandardMaterial({ color: 0x17140e, roughness: 0.94 }),
      charcoal: new THREE.MeshStandardMaterial({ color: 0x050706, roughness: 0.88 }),
      soil: new THREE.MeshStandardMaterial({ color: 0x181008, roughness: 0.96 }),
      gravel: new THREE.MeshStandardMaterial({ color: 0x2c281b, roughness: 0.9 }),
      moss: new THREE.MeshStandardMaterial({ color: 0x17290a, roughness: 0.9 }),
      stem: new THREE.MeshStandardMaterial({ color: 0x243217, roughness: 0.84 }),
    };

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        modelRoot = gltf.scene;
        modelRoot.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = false;
          child.receiveShadow = false;
          const materialName = Array.isArray(child.material)
            ? child.material.map((material) => material.name).join(' ')
            : child.material.name;
          const identity = `${child.name} ${materialName}`;
          const replaceMaterial = (material: THREE.Material) => {
            const previous = Array.isArray(child.material) ? child.material : [child.material];
            previous.forEach((item) => replacedMaterials.add(item));
            child.material = material;
          };
          const tintStandardMaterial = (color: number, roughness: number) => {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
              if (material instanceof THREE.MeshStandardMaterial) {
                material.color.setHex(color);
                material.roughness = roughness;
                material.needsUpdate = true;
              }
            });
          };

          if (/glass vessel|thin glass rim|optical glass/i.test(identity)) {
            replaceMaterial(new THREE.MeshPhysicalMaterial({
              color: 0xdde9df,
              metalness: 0,
              roughness: 0.045,
              transmission: 0.68,
              thickness: 0.04,
              ior: 1.47,
              transparent: true,
              opacity: 0.1,
              depthWrite: false,
              side: THREE.DoubleSide,
            }));
          } else if (/condensation|water droplets/i.test(identity)) {
            replaceMaterial(new THREE.MeshPhysicalMaterial({
              color: 0xe4eee8,
              roughness: 0.08,
              transmission: 0.78,
              thickness: 0.035,
              ior: 1.33,
              transparent: true,
              opacity: 0.72,
              depthWrite: false,
            }));
          } else if (/scanned fern/i.test(materialName)) {
            tintStandardMaterial(0x78944e, 0.76);
          } else if (/scanned moss/i.test(materialName)) {
            tintStandardMaterial(0x8aaa51, 0.84);
          } else if (/fern stems/i.test(materialName)) {
            replaceMaterial(webMaterials.stem);
          } else if (/drainage/i.test(materialName)) {
            replaceMaterial(webMaterials.drainage);
          } else if (/charcoal/i.test(materialName)) {
            replaceMaterial(webMaterials.charcoal);
          } else if (/humid soil/i.test(materialName)) {
            replaceMaterial(webMaterials.soil);
          } else if (/surface pebbles/i.test(materialName)) {
            replaceMaterial(webMaterials.gravel);
          } else if (/dark wet basalt/i.test(materialName)) {
            tintStandardMaterial(0x252d26, 0.76);
          } else if (/moist sphagnum cushion/i.test(materialName)) {
            replaceMaterial(webMaterials.moss);
          }
        });

        const bounds = new THREE.Box3().setFromObject(modelRoot);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        modelRoot.position.sub(center);
        baseScale = 5.45 / Math.max(size.x, size.y, size.z);
        modelPivot.add(modelRoot);
        setLoadState('ready');
      },
      undefined,
      () => {
        if (!disposed) setLoadState('error');
      },
    );

    const render = () => {
      renderedProgress += (progressRef.current - renderedProgress) * 0.085;
      const scale = baseScale * (0.91 + renderedProgress * 0.19);
      modelPivot.scale.setScalar(scale);
      modelPivot.rotation.y = -0.42 + renderedProgress * 0.96;
      modelPivot.rotation.x = 0.035 + Math.sin(renderedProgress * Math.PI) * 0.022;
      modelPivot.position.x = Math.sin(renderedProgress * Math.PI) * 0.11;
      modelPivot.position.y = -0.07 + renderedProgress * 0.06;
      canvas.dataset.modelRotation = modelPivot.rotation.y.toFixed(4);
      canvas.dataset.modelScale = (0.91 + renderedProgress * 0.19).toFixed(4);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      draco.dispose();
      if (modelRoot) {
        modelRoot.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(disposeMaterial);
        });
      }
      replacedMaterials.forEach(disposeMaterial);
      Object.values(webMaterials).forEach(disposeMaterial);
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [modelUrl, progressRef]);

  const isReady = loadState === 'ready';
  return (
    <div className={styles.webglStack} data-load-state={loadState}>
      <Image
        src="/models/terrarium-hero-poster.webp"
        alt="背の高いシダと立体的な苔が広がるガラスのテラリウム"
        fill
        priority={false}
        sizes="100vw"
        quality={90}
        data-testid="terrarium-webgl-poster"
        className={isReady ? styles.webglPosterHidden : styles.webglPoster}
      />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="スクロールに合わせて回転し、近づいて見られる苔の森の3Dテラリウム"
        data-testid="terrarium-webgl-canvas"
        data-renderer="three-gltf"
        data-model={modelUrl}
        data-load-state={loadState}
        data-model-rotation="-0.4200"
        data-model-scale="0.9100"
        className={styles.webglCanvas}
      />
      {loadState === 'loading' ? (
        <span className={styles.webglStatus} aria-live="polite">Cultivating the forest…</span>
      ) : null}
    </div>
  );
}
