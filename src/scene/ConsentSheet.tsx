import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ConsentSheet({
  chapter,
  reducedMotion,
}: {
  chapter: number;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(0.85, 0.35, 6.6);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    const sheet = new THREE.Group();
    const paper = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.2, 2.85, 0.035)),
      track(new THREE.MeshStandardMaterial({ color: "#f7f7f2", roughness: 0.9, metalness: 0 })),
    );
    sheet.add(paper);

    const rule = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.62, 0.018, 0.01)),
      track(new THREE.MeshBasicMaterial({ color: "#387d73" })),
    );
    rule.position.set(-0.62, 1.08, 0.03);
    sheet.add(rule);

    const ink = track(new THREE.MeshBasicMaterial({ color: "#102b35" }));
    for (let line = 0; line < 8; line += 1) {
      const width = line % 4 === 3 ? 1.05 : 1.58;
      const row = new THREE.Mesh(track(new THREE.BoxGeometry(width, 0.012, 0.01)), ink);
      row.position.set((width - 1.58) / 2, 0.78 - line * 0.22, 0.03);
      sheet.add(row);
    }
    scene.add(sheet);

    scene.add(new THREE.AmbientLight("#f7f7f2", 0.9));
    const key = new THREE.DirectionalLight("#d7ece5", 1.15);
    key.position.set(2.2, 2.4, 4);
    scene.add(key);

    const resize = () => {
      const width = parent.clientWidth || 320;
      const height = parent.clientHeight || 420;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    let disposed = false;
    let frame = 0;
    const targetYaw = -0.28 + chapter * 0.06;
    sheet.rotation.x = -0.08;

    const render = () => {
      if (disposed) return;
      sheet.rotation.y += (targetYaw - sheet.rotation.y) * (reducedMotion ? 1 : 0.08);
      renderer.render(scene, camera);
      if (!reducedMotion && Math.abs(targetYaw - sheet.rotation.y) > 0.001) {
        frame = requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    };
  }, [chapter, reducedMotion]);

  return <canvas ref={canvasRef} className="sheet-canvas" aria-hidden="true" />;
}
