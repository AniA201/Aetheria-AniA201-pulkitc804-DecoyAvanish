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
    const material = new THREE.MeshBasicMaterial({ color: "#3c3f44", wireframe: true, transparent: true, opacity: .8 });
    const globeGeometry = new THREE.IcosahedronGeometry(1, 2);
    globe.add(new THREE.Mesh(globeGeometry, material));
    const dotMaterial = new THREE.MeshBasicMaterial({ color: "#0d5b58" });
    const dotGeometry = new THREE.SphereGeometry(.095, 16, 16);
    [[0,.78,.5],[.85,.15,.4],[-.76,.25,.52],[.38,-.78,.45],[-.25,-.62,.8],[.62,.63,.25],[-.55,-.48,.38],[.08,.12,1.01]].forEach(([x,y,z]) => { const dot = new THREE.Mesh(dotGeometry, dotMaterial); dot.position.set(x,y,z); globe.add(dot); });
    const resize = () => { const width = canvas.clientWidth || 1; const height = canvas.clientHeight || 1; renderer.setSize(width,height,false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    let frame = 0;
    let hovering = false;
    let lastPointerX: number | null = null;
    let spin = 0;
    let targetTiltX = 0;
    let targetTiltZ = 0;
    const onPointerEnter = () => { hovering = true; canvas.style.cursor = "grab"; };
    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const bounds = canvas.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
      targetTiltX = -y * .32;
      targetTiltZ = -x * .18;
      if (lastPointerX !== null) spin = THREE.MathUtils.clamp(spin + (event.clientX - lastPointerX) * .009, -.16, .16);
      lastPointerX = event.clientX;
    };
    const onPointerLeave = () => { hovering = false; lastPointerX = null; targetTiltX = 0; targetTiltZ = 0; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerenter", onPointerEnter);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    const tick = () => {
      if (!reducedMotion) {
        globe.rotation.y += .006 + spin;
        globe.rotation.x += (targetTiltX - globe.rotation.x) * .075;
        globe.rotation.z += (targetTiltZ - globe.rotation.z) * .075;
        spin *= hovering ? .92 : .955;
      }
      renderer.render(scene,camera);
      if (!reducedMotion) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      globeGeometry.dispose(); dotGeometry.dispose(); material.dispose(); dotMaterial.dispose(); renderer.dispose();
    };
  }, [reducedMotion]);
  return <canvas ref={ref} className="form-map-3d" aria-label="Interactive five-section form map" role="img" />;
}
