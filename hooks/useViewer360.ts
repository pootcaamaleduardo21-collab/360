'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { Hotspot, Scene, ViewerConfig } from '@/types/tour.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HotspotScreenPosition {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

interface UseViewer360Options {
  containerRef: React.RefObject<HTMLDivElement>;
  scene: Scene | null;
  config: ViewerConfig;
  isEditing?: boolean;
  onAddHotspot?: (yaw: number, pitch: number) => void;
  onHotspotClick?: (hotspot: Hotspot) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPHERE_RADIUS = 500;
const DRAG_SENSITIVITY = 0.1;

// ─── Coordinate conversion helpers ────────────────────────────────────────────

/**
 * Convert spherical coordinates (yaw/pitch in degrees) to a unit 3D vector.
 * Convention: yaw=0 → +Z axis (front), yaw=90 → +X (right).
 */
export function sphericalToVector3(yaw: number, pitch: number): THREE.Vector3 {
  const phi   = THREE.MathUtils.degToRad(90 - pitch); // polar angle from +Y
  const theta = THREE.MathUtils.degToRad(yaw);         // azimuthal from +Z
  return new THREE.Vector3(
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.cos(theta)
  );
}

/**
 * Convert a unit 3D vector back to yaw/pitch (degrees).
 */
export function vector3ToSpherical(v: THREE.Vector3): { yaw: number; pitch: number } {
  const pitch = THREE.MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, v.y))));
  const yaw   = THREE.MathUtils.radToDeg(Math.atan2(v.x, v.z));
  return { yaw, pitch };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useViewer360({
  containerRef,
  scene,
  config,
  isEditing = false,
  onAddHotspot,
  onHotspotClick,
}: UseViewer360Options) {
  const rendererRef        = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef          = useRef<THREE.PerspectiveCamera | null>(null);
  const threeSceneRef      = useRef<THREE.Scene | null>(null);
  const sphereMeshRef      = useRef<THREE.Mesh | null>(null);
  const rafRef             = useRef<number>(0);
  const isDragging         = useRef(false);
  const dragStart          = useRef({ x: 0, y: 0 });
  const cameraAngles       = useRef({ lon: 0, lat: 0 }); // current look-at direction
  const dragStartAngles    = useRef({ lon: 0, lat: 0 });
  const clickStartPos      = useRef({ x: 0, y: 0 });
  const textureLoaderRef   = useRef(new THREE.TextureLoader());
  const currentTextureRef  = useRef<THREE.Texture | null>(null);

  const [isLoading,              setIsLoading]              = useState(false);
  const [error,                  setError]                  = useState<string | null>(null);
  const [hotspotPositions,       setHotspotPositions]       = useState<HotspotScreenPosition[]>([]);

  // ── Renderer bootstrap (runs once) ──────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Three.js scene
    const threeScene = new THREE.Scene();
    threeSceneRef.current = threeScene;

    // Camera — placed at origin, looks outward at the sphere interior
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      SPHERE_RADIUS * 2
    );
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // Sphere geometry — scale(-1,1,1) flips normals inward so texture shows inside
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 32);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({
      color: 0x111111,
      side: THREE.FrontSide,
    });

    const sphere = new THREE.Mesh(geometry, material);
    threeScene.add(sphere);
    sphereMeshRef.current = sphere;

    // ── Animation loop ─────────────────────────────────────────────────────
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const lat = THREE.MathUtils.clamp(cameraAngles.current.lat, -85, 85);
      const phi   = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(cameraAngles.current.lon);

      // Target point on the sphere surface
      camera.lookAt(
        SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
        SPHERE_RADIUS * Math.cos(phi),
        SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta)
      );

      renderer.render(threeScene, camera);

      // Update hotspot 2D positions every frame
      updateHotspotScreenPositions();
    };

    animate();

    // ── Input handlers ─────────────────────────────────────────────────────

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      clickStartPos.current = { x: e.clientX, y: e.clientY };
      dragStartAngles.current = { ...cameraAngles.current };
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      cameraAngles.current.lon = dragStartAngles.current.lon - dx * DRAG_SENSITIVITY;
      cameraAngles.current.lat = dragStartAngles.current.lat + dy * DRAG_SENSITIVITY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      container.releasePointerCapture(e.pointerId);

      // Only treat as a click if the pointer barely moved (not a drag)
      const dx = Math.abs(e.clientX - clickStartPos.current.x);
      const dy = Math.abs(e.clientY - clickStartPos.current.y);
      if (dx < 5 && dy < 5) handleClick(e);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const fov = THREE.MathUtils.clamp(
        cameraRef.current.fov + e.deltaY * 0.05,
        config.minFov,
        config.maxFov
      );
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();
    };

    // ── Resize observer ────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      if (!camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup',   onPointerUp);
    container.addEventListener('wheel',       onWheel, { passive: false });

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup',   onPointerUp);
      container.removeEventListener('wheel',       onWheel);
      currentTextureRef.current?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Bootstrap once — config changes handled by separate effects below

  // ── Load texture when scene changes ────────────────────────────────────────

  useEffect(() => {
    if (!scene || !sphereMeshRef.current) return;

    setIsLoading(true);
    setError(null);

    // Dispose previous texture to free GPU memory
    currentTextureRef.current?.dispose();

    const loader = textureLoaderRef.current;
    loader.load(
      scene.imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter  = THREE.LinearFilter;
        texture.magFilter  = THREE.LinearFilter;
        texture.generateMipmaps = false;
        currentTextureRef.current = texture;

        const mat = sphereMeshRef.current!.material as THREE.MeshBasicMaterial;
        mat.map = texture;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;

        // Jump camera to scene's initial view if specified
        if (scene.initialYaw   !== undefined) cameraAngles.current.lon = scene.initialYaw;
        if (scene.initialPitch !== undefined) cameraAngles.current.lat = scene.initialPitch;

        setIsLoading(false);
      },
      undefined,
      () => {
        setError('No se pudo cargar la imagen 360°. Verifica el formato (JPEG/PNG equirectangular).');
        setIsLoading(false);
      }
    );
  }, [scene?.imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync FOV when config changes ───────────────────────────────────────────

  useEffect(() => {
    if (!cameraRef.current) return;
    cameraRef.current.fov = config.fov;
    cameraRef.current.updateProjectionMatrix();
  }, [config.fov]);

  // ── Project hotspots to screen space ──────────────────────────────────────

  const updateHotspotScreenPositions = useCallback(() => {
    const camera    = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container || !scene) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const positions = scene.hotspots.map((hotspot) => {
      // World-space position on the sphere
      const worldPos = sphericalToVector3(hotspot.yaw, hotspot.pitch)
        .multiplyScalar(SPHERE_RADIUS);

      // Project to NDC
      const ndc = worldPos.clone().project(camera);

      // NDC z > 1 means the point is behind the camera
      const visible = ndc.z <= 1;

      const x = (ndc.x  *  0.5 + 0.5) * w;
      const y = (-ndc.y * 0.5 + 0.5) * h;

      return { id: hotspot.id, x, y, visible };
    });

    setHotspotPositions(positions);
  }, [scene, containerRef]);

  // ── Click handler for raycasting (add hotspot in edit mode) ───────────────

  const handleClick = useCallback(
    (e: PointerEvent) => {
      const camera    = cameraRef.current;
      const sphere    = sphereMeshRef.current;
      const container = containerRef.current;
      if (!camera || !sphere || !container) return;

      const rect  = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / container.clientWidth)  *  2 - 1,
        -((e.clientY - rect.top) / container.clientHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObject(sphere);
      if (hits.length === 0) return;

      const point = hits[0].point.normalize();
      const { yaw, pitch } = vector3ToSpherical(point);

      if (isEditing && onAddHotspot) {
        onAddHotspot(yaw, pitch);
      }
    },
    [isEditing, onAddHotspot, containerRef]
  );

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Smoothly point the camera at the given yaw/pitch */
  const lookAt = useCallback((yaw: number, pitch: number) => {
    cameraAngles.current.lon = yaw;
    cameraAngles.current.lat = THREE.MathUtils.clamp(pitch, -85, 85);
  }, []);

  return {
    isLoading,
    error,
    hotspotPositions,
    lookAt,
  };
}
