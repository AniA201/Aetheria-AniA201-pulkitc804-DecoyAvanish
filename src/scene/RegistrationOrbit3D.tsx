import { useEffect, useRef } from "react";
import * as THREE from "three";

/** A lightweight cursor-responsive 3D version of the Aetheria comparison mark. */
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
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0, 0, 5.2);
    const mark = new THREE.Group();
    scene.add(mark);
    const pieces: THREE.Material[] = [];
    const addPanel = (side: -1 | 1) => {
      const panel = new THREE.Group();
      const panelMaterial = new THREE.MeshBasicMaterial({ color: side < 0 ? "#0d5b58" : "#cfeBDD", transparent: true, opacity: 0.82 });
      const edgeMaterial = new THREE.MeshBasicMaterial({ color: "#083f3e", transparent: true, opacity: 0.82 });
      pieces.push(panelMaterial, edgeMaterial);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.18, 0.09), panelMaterial);
      panel.add(body);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.22, 0.11), edgeMaterial);
      edge.position.x = side * -0.43;
      panel.add(edge);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: side < 0 ? "#cfeBDD" : "#0d5b58", transparent: true, opacity: 0.86 });
      pieces.push(lineMaterial);
      [-0.25, 0, 0.25].forEach((y) => {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.045, 0.11), lineMaterial);
        line.position.set(side * 0.04, y, 0.08);
        panel.add(line);
      });
      panel.position.x = side * 0.54;
      panel.rotation.y = side * -0.26;
      mark.add(panel);
    };
    addPanel(-1); addPanel(1);
    const starMaterial = new THREE.MeshBasicMaterial({ color: "#f7f7f2", transparent: true, opacity: 0.9 });
    pieces.push(starMaterial);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), starMaterial);
    star.rotation.z = Math.PI / 4;
    mark.add(star);

    const resize = () => {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    let targetX = 0; let targetY = 0; let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const bounds = canvas.getBoundingClientRect();
      targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.7;
      targetX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -0.35;
    };
    const reset = () => { targetX = 0; targetY = 0; };
    canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerleave", reset);
    const render = () => {
      if (!reducedMotion) {
        mark.rotation.x += (targetX - mark.rotation.x) * 0.055;
        mark.rotation.y += (targetY - mark.rotation.y) * 0.055;
        star.rotation.y += 0.012;
        frame = requestAnimationFrame(render);
      }
      renderer.render(scene, camera);
    };
    render();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerleave", reset); pieces.forEach((material) => material.dispose()); renderer.dispose(); };
  }, [reducedMotion]);

  return <canvas ref={ref} className="registration-orbit-3d" role="img" aria-label="Interactive Aetheria mark" />;
}
