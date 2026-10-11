import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { makeFolioTextures } from "./documentTextures";

const scrollBlur = {
  uniforms: {
    tDiffuse: { value: null },
    direction: { value: new THREE.Vector2() },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 direction;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv) * 0.58;
      color += texture2D(tDiffuse, clamp(vUv + direction * 0.25, 0.0, 1.0)) * 0.14;
      color += texture2D(tDiffuse, clamp(vUv - direction * 0.25, 0.0, 1.0)) * 0.14;
      color += texture2D(tDiffuse, clamp(vUv + direction * 0.65, 0.0, 1.0)) * 0.07;
      color += texture2D(tDiffuse, clamp(vUv - direction * 0.65, 0.0, 1.0)) * 0.07;
      gl_FragColor = color;
    }
  `,
};

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function makePage(texture: THREE.Texture, width: number, height: number) {
  const group = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, color: "#f7f7f2", toneMapped: false, side: THREE.DoubleSide, transparent: true }),
  );
  face.position.z = 0.02;
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.028),
    new THREE.MeshBasicMaterial({ color: "#f7f7f2", toneMapped: false, transparent: true }),
  );
  group.add(edge, face);
  return { group, face, edge };
}

export function MedicalField({
  reducedMotion,
  progressRef,
  selectedPaperRef,
}: {
  reducedMotion: boolean;
  progressRef: RefObject<number>;
  selectedPaperRef: RefObject<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
    camera.position.set(0.15, 0.05, 7.1);
    const composer = reducedMotion ? null : new EffectComposer(renderer);
    const blurPass = composer ? new ShaderPass(scrollBlur) : null;
    const outputPass = composer ? new OutputPass() : null;
    if (composer && blurPass && outputPass) {
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(blurPass);
      composer.addPass(outputPass);
    }

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    scene.add(new THREE.AmbientLight("#243036", 0.55));
    const key = new THREE.SpotLight("#f7f7f2", 28, 22, 0.48, 0.45, 1);
    key.position.set(0.4, 3.4, 6.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#b7d4cc", 0.85);
    rim.position.set(-4, 1.4, 2);
    scene.add(rim);

    const folioTextures = makeFolioTextures(renderer.capabilities.getMaxAnisotropy());
    folioTextures.textures.forEach(track);

    const folio = new THREE.Group();
    scene.add(folio);

    // A deliberately simple two-panel navy folder. The front is hinged on
    // the right so it visibly swings open to the left before fading away.
    const folder = new THREE.Group();
    const makeFolderPanel = (color: string, marked = false) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 584;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to draw folder cover");
      context.fillStyle = color;
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (marked) {
        context.strokeStyle = "#cfeedd";
        context.lineWidth = 14;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(138, 160);
        context.quadraticCurveTo(200, 196, 224, 202);
        context.lineTo(224, 376);
        context.quadraticCurveTo(188, 380, 138, 410);
        context.closePath();
        context.stroke();
        context.beginPath();
        context.moveTo(374, 160);
        context.quadraticCurveTo(312, 196, 288, 202);
        context.lineTo(288, 376);
        context.quadraticCurveTo(324, 380, 374, 410);
        context.closePath();
        context.stroke();
        context.beginPath();
        context.moveTo(166, 250); context.lineTo(204, 250);
        context.moveTo(166, 292); context.lineTo(204, 292);
        context.moveTo(308, 250); context.lineTo(346, 250);
        context.moveTo(308, 292); context.lineTo(346, 292);
        context.stroke();
      }
      const texture = track(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = track(new THREE.SpriteMaterial({ map: texture, transparent: true, toneMapped: false }));
      const panel = new THREE.Sprite(material);
      panel.scale.set(2.04, 2.32, 1);
      return { panel, material };
    };
    // One physical cover is enough for this short reveal. A second panel was
    // reading as a loose vertical bar once perspective and motion blur were
    // applied, so the cover itself supplies the entire opening gesture.
    const folderFrontHinge = new THREE.Group();
    folderFrontHinge.position.set(1.02, 0.04, 0.08);
    const { panel: folderFront, material: navyFront } = makeFolderPanel("#063f4a", true);
    folderFront.position.x = -1.02;
    folderFrontHinge.add(folderFront);
    folder.add(folderFrontHinge);
    folio.add(folder);

    const pages = folioTextures.pages.map((sheet) => makePage(sheet.texture, 1.56, 2.02));
    folio.add(...pages.map((page) => page.group));
    pages.forEach((page) => {
      track(page.face.geometry);
      track(page.face.material);
      track(page.edge.geometry);
      track(page.edge.material);
    });

    const shadowGeometry = track(new THREE.CircleGeometry(0.58, 40));
    const shadows = pages.map(() => {
      const material = track(
        new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.34, depthWrite: false }),
      );
      const mesh = new THREE.Mesh(shadowGeometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -1.08;
      mesh.renderOrder = -1;
      folio.add(mesh);
      return mesh;
    });

    document.fonts?.ready.then(folioTextures.redraw).catch(() => undefined);

    const pointer = { x: 0, y: 0 };
    const sway = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      if (reducedMotion) return;
      pointer.x = event.clientX / window.innerWidth - 0.5;
      pointer.y = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onPointer);

    const resize = () => {
      const width = parent.clientWidth || window.innerWidth;
      const height = parent.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      composer?.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    let disposed = false;
    let frame = 0;
    const focusLevels = pages.map(() => 0);
    let previousProgress = progressRef.current ?? 0;
    let blurVelocity = 0;
    let scrollDirection = 1;

    const render = () => {
      if (disposed) return;
      const progress = Math.min(1, Math.max(0, progressRef.current ?? 0));
      const scrollDelta = progress - previousProgress;
      previousProgress = progress;
      if (Math.abs(scrollDelta) > 0.0001) scrollDirection = Math.sign(scrollDelta);
      blurVelocity += (Math.min(0.0013, Math.abs(scrollDelta) * 0.075) - blurVelocity) * 0.28;
      blurPass?.uniforms.direction.value.set(scrollDirection * blurVelocity, blurVelocity * 0.06);
      const narrow = parent.clientWidth < 900;
      sway.x += ((reducedMotion ? 0 : pointer.x) * 0.12 - sway.x) * 0.05;
      sway.y += ((reducedMotion ? 0 : pointer.y) * 0.06 - sway.y) * 0.05;

      const turn = reducedMotion ? 1 : smoothstep(progress / 0.25);
      // Have the full stack in view as the chapter list enters the viewport.
      const fan = reducedMotion ? 1 : smoothstep((progress - 0.1) / 0.25);
      const folderOpen = reducedMotion ? 1 : smoothstep((progress - 0.04) / 0.3);
      const folderExit = reducedMotion ? 1 : smoothstep((progress - 0.2) / 0.2);
      const yaw = -0.95 + turn * 0.8;
      const heroPosition = 1 - turn;
      const heroRightShift = parent.clientWidth < 600 ? 0.18 : 1.35;

      folio.position.set(
        (narrow ? 1.15 : 0.85) - turn * (narrow ? 0.55 : 0.48) - heroPosition * (narrow ? 0.16 : 0.27) + heroPosition * heroRightShift,
        (narrow ? -0.35 : -0.02) + heroPosition * (narrow ? 0.1 : 0.25),
        0,
      );
      folio.scale.setScalar(narrow ? 0.7 : 0.92);
      folio.rotation.set(sway.y * 0.04, yaw + sway.x * 0.06, 0);

      // Slide the closed cover out to the left as the papers fan into view.
      // It stays in its own lane throughout the reveal, never through a page.
      folderFrontHinge.position.x = 0.88 - folderOpen * 2.8;
      folderFrontHinge.rotation.set(0, 0, -folderOpen * 0.08);
      folder.position.set(0, folderExit * 0.08, -folderExit * 0.58);
      // The folio itself is angled for the paper depth. Counter that angle for
      // the folder so its closed front remains a clear, square navy panel.
      folder.rotation.set(0, -yaw - sway.x * 0.06, 0);
      folder.scale.setScalar(0.68 * (1 - folderExit * 0.08));
      navyFront.opacity = Math.max(0, 1 - folderExit * 1.12);

      const spacing = narrow ? 0.12 : 0.47;
      const lanes = [
        { restX: 0, restZ: 0.1, outX: 0, outY: 0, outZ: 0.1 },
        { restX: -0.03, restZ: 0.04, outX: spacing, outY: 0.07, outZ: 0.04 },
        { restX: -0.06, restZ: -0.02, outX: spacing * 2, outY: 0.14, outZ: -0.02 },
        { restX: -0.09, restZ: -0.08, outX: spacing * 3, outY: 0.21, outZ: -0.08 },
      ];
      pages.forEach((page, index) => {
        const lane = lanes[index];
        const t = smoothstep(Math.min(1, Math.max(0, (fan - index * 0.06) / 0.82)));
        page.group.position.set(
          lane.restX + (lane.outX - lane.restX) * t,
          lane.outY * t,
          lane.restZ + (lane.outZ - lane.restZ) * t,
        );
        page.group.rotation.set(0, 0, [-0.018, 0.016, -0.014, 0.02][index] * fan);
        page.group.scale.setScalar(1);
        const pageReveal = reducedMotion ? 1 : smoothstep((folderOpen - 0.08) / 0.42);
        (page.face.material as THREE.MeshBasicMaterial).opacity = pageReveal;
        (page.edge.material as THREE.MeshBasicMaterial).opacity = pageReveal;
      });

      const selectedIndex = selectedPaperRef.current;
      pages.forEach((page, index) => {
        focusLevels[index] += ((index === selectedIndex ? 1 : 0) - focusLevels[index]) * (reducedMotion ? 1 : 0.095);
        page.group.position.x += focusLevels[index] * fan * (narrow ? -index * spacing : [1.12, 0.72, 0.45, 0.18][index]);
        page.group.position.y -= focusLevels[index] * fan * 0.28;
        page.group.position.z += focusLevels[index] * fan * 1.42;
        page.group.scale.setScalar(1 + focusLevels[index] * fan * 0.31);
        page.group.rotation.y -= focusLevels[index] * fan * 0.085;
        page.group.rotation.z -= focusLevels[index] * fan * 0.025;
        page.face.renderOrder = index === selectedIndex ? 2 : 0;
        page.edge.renderOrder = index === selectedIndex ? 1 : 0;
      });

      const facing = 0.34 + turn * 0.66;
      pages.forEach((page, index) => {
        const shadow = shadows[index];
        shadow.position.set(page.group.position.x, -1.12, page.group.position.z + 0.04);
        shadow.scale.set(facing, 0.16, 1);
        (shadow.material as THREE.MeshBasicMaterial).opacity = index === selectedIndex ? 0.47 : 0.22;
      });

      camera.position.set(0.15 + sway.x * 0.2, 0.06 - sway.y * 0.08, 7.35 - turn * 0.35);
      camera.lookAt(0.35, -0.05, 0);
      if (composer) composer.render();
      else renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((item) => item.dispose());
      blurPass?.dispose();
      outputPass?.dispose();
      composer?.dispose();
      renderer.dispose();
    };
  }, [progressRef, reducedMotion]);

  return <canvas ref={canvasRef} className="field-canvas" aria-hidden="true" />;
}
