'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Loader2, AlertTriangle, Box, X } from 'lucide-react';
import type { TourModel3D } from '@/types/tour.types';

interface Model3DViewerProps {
  model: TourModel3D;
  brandColor?: string;
  onClose: () => void;
}

export function Model3DViewer({ model, brandColor, onClose }: Model3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    if (model.format === 'splat') {
      setLoading(false);
      setError('El archivo quedó guardado. El visor de Gaussian Splatting entra en la siguiente fase.');
      return;
    }

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 2000);
    camera.position.set(4, 3, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 2.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(4, 8, 6);
    scene.add(keyLight);

    const grid = new THREE.GridHelper(20, 20, 0x334155, 0x111827);
    grid.position.y = -0.01;
    scene.add(grid);

    let disposed = false;
    let frame = 0;
    const applyDefaultMaterial = (object: THREE.Object3D) => {
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (!mesh.material) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xdbeafe,
            roughness: 0.65,
            metalness: 0.05,
          });
        }
        mesh.castShadow = false;
        mesh.receiveShadow = true;
      });
    };

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = Math.max(rect.width, 1) / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    };

    const frameModel = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const distance = maxDim * 1.65;
      camera.position.set(distance, distance * 0.68, distance);
      camera.near = Math.max(maxDim / 1000, 0.01);
      camera.far = maxDim * 20;
      camera.updateProjectionMatrix();

      controls.target.set(0, 0, 0);
      controls.maxDistance = maxDim * 8;
      controls.update();
    };

    const handleLoaded = (object: THREE.Object3D) => {
      if (disposed) return;
      applyDefaultMaterial(object);
      scene.add(object);
      frameModel(object);
      setLoading(false);
    };

    const handleLoadError = () => {
      if (disposed) return;
      setLoading(false);
      setError('No se pudo cargar el modelo 3D. Revisa que el archivo sea válido, público y no dependa de texturas privadas.');
    };

    if (model.format === 'glb' || model.format === 'gltf') {
      new GLTFLoader().load(model.url, (gltf) => handleLoaded(gltf.scene), undefined, handleLoadError);
    } else if (model.format === 'obj') {
      new OBJLoader().load(model.url, handleLoaded, undefined, handleLoadError);
    } else if (model.format === 'ply') {
      new PLYLoader().load(
        model.url,
        (geometry) => {
          geometry.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({
            color: 0xdbeafe,
            roughness: 0.68,
            metalness: 0.02,
            vertexColors: geometry.hasAttribute('color'),
          });
          handleLoaded(new THREE.Mesh(geometry, material));
        },
        undefined,
        handleLoadError
      );
    } else {
      setLoading(false);
      setError('Formato 3D todavía no renderizable en el visor.');
    }

    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
    };
  }, [model.format, model.url]);

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <div ref={mountRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 via-black/30 to-transparent p-4">
        <div className="pointer-events-auto flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              style={{ color: brandColor ?? '#60a5fa' }}
            >
              <Box className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{model.title || 'Plano 3D'}</p>
              <p className="truncate text-xs text-white/50">{model.filename || model.format.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            title="Cerrar plano 3D"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-blue-400" />
            <p className="text-sm text-white/60">Cargando plano 3D...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950 p-6">
          <div className="max-w-sm text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
            <p className="mb-1 font-semibold text-white">Modelo no disponible</p>
            <p className="text-sm leading-6 text-white/55">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
