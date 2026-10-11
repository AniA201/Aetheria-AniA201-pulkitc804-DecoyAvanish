import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

const letters = "Aetheria";
const flight = [
  [-0.43, -0.34, -0.54],
  [-0.31, 0.31, 0.37],
  [-0.19, -0.42, -0.32],
  [-0.06, 0.43, 0.47],
  [0.15, -0.39, -0.43],
  [0.28, 0.29, 0.39],
  [0.41, -0.31, -0.35],
  [0.52, 0.36, 0.42],
] as const;

function ease(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

type Glyph = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  ghost: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  origin: THREE.Vector2;
  geometry: THREE.PlaneGeometry;
  texture: THREE.CanvasTexture;
  materials: [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial];
};

/** A transparent, pointer-free WebGL layer over the decorative landing word. */
export function LandingWordShatter({
  progress: targetProgress,
  wordRef,
}: {
  progress: number;
  wordRef: RefObject<HTMLParagraphElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(targetProgress);
  progressRef.current = targetProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    const word = wordRef.current;
    if (!canvas || !word) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 20);
    camera.position.z = 10;
    let glyphs: Glyph[] = [];
    let width = 1;
    let height = 1;
    let disposed = false;

    const clearGlyphs = () => {
      glyphs.forEach(({ mesh, ghost, geometry, texture, materials }) => {
        scene.remove(mesh, ghost);
        geometry.dispose();
        texture.dispose();
        materials.forEach((material) => material.dispose());
      });
      glyphs = [];
    };

    const rebuild = () => {
      if (disposed) return;
      clearGlyphs();
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      renderer.setSize(width, height, false);
      camera.left = 0;
      camera.right = width;
      camera.top = 0;
      camera.bottom = height;
      camera.updateProjectionMatrix();

      const style = window.getComputedStyle(word);
      const fontSize = Number.parseFloat(style.fontSize) || 150;
      const spans = Array.from(word.querySelectorAll("span"));
      spans.forEach((span, index) => {
        const rect = span.getBoundingClientRect();
        const pad = Math.max(12, fontSize * 0.1);
        const planeWidth = rect.width + pad * 2;
        const planeHeight = Math.max(rect.height, fontSize) + pad * 2;
        const textureCanvas = document.createElement("canvas");
        const resolution = 2;
        textureCanvas.width = Math.ceil(planeWidth * resolution);
        textureCanvas.height = Math.ceil(planeHeight * resolution);
        const context = textureCanvas.getContext("2d");
        if (!context) return;
        context.scale(resolution, resolution);
        context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
        context.textBaseline = "alphabetic";
        context.fillStyle = "rgba(8, 63, 62, 0.78)";
        context.shadowColor = "rgba(5, 51, 49, 0.28)";
        context.shadowBlur = Math.max(4, fontSize * 0.08);
        context.shadowOffsetY = Math.max(3, fontSize * 0.04);
        context.fillText(letters[index], pad, pad + fontSize * 0.81);

        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
        const ghostMaterial = material.clone();
        ghostMaterial.opacity = 0;
        const mesh = new THREE.Mesh(geometry, material);
        const ghost = new THREE.Mesh(geometry, ghostMaterial);
        ghost.position.z = -0.01;
        scene.add(ghost, mesh);
        glyphs.push({
          mesh,
          ghost,
          origin: new THREE.Vector2(rect.left - bounds.left + rect.width / 2, rect.top - bounds.top + rect.height / 2),
          geometry,
          texture,
          materials: [material, ghostMaterial],
        });
      });
    };

    rebuild();
    const observer = new ResizeObserver(rebuild);
    observer.observe(word);
    observer.observe(canvas);
    document.fonts?.ready.then(rebuild).catch(() => undefined);

    let frame = 0;
    let last = performance.now();
    let progress = 0;
    const draw = (now: number) => {
      if (disposed) return;
      const elapsed = Math.min(now - last, 64);
      last = now;
      // Follow the scroll position with inertia so a fast scroll still shows the flight.
      progress += (progressRef.current - progress) * Math.min(1, elapsed / 380);
      glyphs.forEach(({ mesh, ghost, origin, materials }, index) => {
        const delayed = ease((progress - index * 0.035) / (1 - index * 0.035));
        const [dx, dy, spin] = flight[index];
        const x = dx * window.innerWidth * delayed;
        const y = dy * window.innerHeight * delayed;
        mesh.position.set(origin.x + x, origin.y + y, 0);
        mesh.rotation.z = spin * delayed;
        mesh.scale.setScalar(1 - delayed * 0.2);
        materials[0].opacity = 1 - delayed * 0.94;

        // A translucent trailing copy softens the moving glyphs like motion blur.
        ghost.position.set(origin.x + x * 0.78, origin.y + y * 0.78, -0.01);
        ghost.rotation.z = spin * delayed * 0.78;
        ghost.scale.setScalar(1 - delayed * 0.16);
        materials[1].opacity = Math.sin(delayed * Math.PI) * 0.2;
      });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearGlyphs();
      renderer.dispose();
    };
  }, [wordRef]);

  return <canvas ref={canvasRef} className="folio-word-canvas" style={{ opacity: Math.min(1, targetProgress * 8) }} aria-hidden="true" />;
}
