import { useEffect, useRef } from "react";
import * as THREE from "three";

export function AskOrb3D({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
    camera.position.z = 4;
    const group = new THREE.Group();
    scene.add(group);
    const sphere = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.78, 3),
      new THREE.MeshBasicMaterial({ color: "#0d5b58", transparent: true, opacity: 0.94 }),
    );
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(sphere.geometry),
      new THREE.LineBasicMaterial({ color: "#b9f0d8", transparent: true, opacity: 0.8 }),
    );
    group.add(sphere, lines);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.02, 1.05, 48),
      new THREE.MeshBasicMaterial({ color: "#5bb99d", transparent: true, opacity: 0.36, side: THREE.DoubleSide }),
    );
    group.add(halo);
    const resize = () => {
      renderer.setSize(canvas.clientWidth || 1, canvas.clientHeight || 1, false);
      camera.aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    let frame = 0;
    const started = performance.now();
    const render = (now: number) => {
      const t = (now - started) / 1000;
      if (!reducedMotion) {
        group.rotation.y = t * 0.36;
        group.rotation.x = Math.sin(t * 0.7) * 0.16;
        group.position.y = Math.sin(t * 1.3) * 0.08;
        halo.rotation.z = -t * 0.22;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render(started);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sphere.geometry.dispose();
      (sphere.material as THREE.Material).dispose();
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [reducedMotion]);

  return <canvas className="ask-orb" ref={canvasRef} aria-hidden="true" />;
}
