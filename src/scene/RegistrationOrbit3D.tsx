import { useEffect, useRef } from "react";
import * as THREE from "three";

/** A calm account-entry marker: source documents orbit a new account. */
export function RegistrationOrbit3D({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0, 5);
    const orbit = new THREE.Group();
    scene.add(orbit);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: "#3c3f44", transparent: true, opacity: 0.72 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.028, 10, 72), ringMaterial);
    ring.rotation.x = Math.PI * 0.36;
    orbit.add(ring);

    const cardGeometry = new THREE.BoxGeometry(0.46, 0.6, 0.08);
    const cardMaterial = new THREE.MeshBasicMaterial({ color: "#0d5b58" });
    const accentMaterial = new THREE.MeshBasicMaterial({ color: "#3c3f44" });
    const lineGeometry = new THREE.BoxGeometry(0.26, 0.025, 0.095);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: "#d0f0dc" });
    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((angle, index) => {
      const document = new THREE.Group();
      const card = new THREE.Mesh(cardGeometry, index === 1 ? accentMaterial : cardMaterial);
      document.add(card);
      [-0.13, 0, 0.13].forEach((y) => {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(0, y, 0.05);
        document.add(line);
      });
      document.position.set(Math.cos(angle) * 1.15, Math.sin(angle) * 0.78, Math.sin(angle) * 0.22);
      document.rotation.z = angle + Math.PI / 2;
      orbit.add(document);
    });

    const resize = () => {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let frame = 0;
    const tick = () => {
      if (!reducedMotion) {
        orbit.rotation.y += 0.008;
        orbit.rotation.z += 0.0015;
      }
      renderer.render(scene, camera);
      if (!reducedMotion) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ring.geometry.dispose();
      cardGeometry.dispose();
      lineGeometry.dispose();
      ringMaterial.dispose();
      cardMaterial.dispose();
      accentMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, [reducedMotion]);

  return <canvas ref={ref} className="registration-orbit-3d" role="img" aria-label="Three study documents orbit a new account" />;
}
