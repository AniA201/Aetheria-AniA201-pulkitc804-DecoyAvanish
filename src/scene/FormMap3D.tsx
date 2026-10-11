import { useEffect, useRef } from "react";
import * as THREE from "three";

/** A small live map: its five dots stand for the five sections in a form. */
export function FormMap3D({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 20); camera.position.z = 4;
    const globe = new THREE.Group(); scene.add(globe);
    const material = new THREE.MeshBasicMaterial({ color: "#b68a2d", wireframe: true, transparent: true, opacity: .75 });
    globe.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), material));
    const dotMaterial = new THREE.MeshBasicMaterial({ color: "#0d5b58" });
    [[0,.78,.5],[.85,.15,.4],[-.76,.25,.52],[.38,-.78,.45],[-.25,-.62,.8]].forEach(([x,y,z]) => { const dot = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 16), dotMaterial); dot.position.set(x,y,z); globe.add(dot); });
    const resize = () => { const width = canvas.clientWidth || 1; const height = canvas.clientHeight || 1; renderer.setSize(width,height,false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    let frame = 0; const tick = () => { if (!reducedMotion) globe.rotation.y += .006; renderer.render(scene,camera); if (!reducedMotion) frame = requestAnimationFrame(tick); }; tick();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); material.dispose(); dotMaterial.dispose(); renderer.dispose(); };
  }, [reducedMotion]);
  return <canvas ref={ref} className="form-map-3d" aria-label="Five-section form map" role="img" />;
}
