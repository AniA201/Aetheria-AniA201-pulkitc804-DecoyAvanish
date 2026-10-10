import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

const paper = "#f3efe4";
const ink = "#1a1d1c";
const clay = "#8d4e38";
const mute = "#5c6562";

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > max && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function paintSheet(ctx: CanvasRenderingContext2D, kind: "consent" | "protocol", width: number, height: number) {
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(26, 29, 28, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.fillStyle = ink;
  ctx.fillRect(72, 78, 148, 3);

  ctx.font = "500 22px Newsreader, Georgia, serif";
  ctx.fillStyle = mute;
  ctx.fillText(kind === "consent" ? "INFORMED CONSENT" : "PROTOCOL", 72, 128);

  ctx.font = "500 54px Newsreader, Georgia, serif";
  ctx.fillStyle = ink;
  ctx.fillText(kind === "consent" ? "ICF-AETHER-01" : "PROT-AETHER-01", 72, 196);

  ctx.font = "400 22px Newsreader, Georgia, serif";
  ctx.fillStyle = mute;
  ctx.fillText(kind === "consent" ? "Version 2.1  ·  12 March 2026" : "Version 3.0  ·  2 March 2026", 72, 238);

  ctx.strokeStyle = clay;
  ctx.lineWidth = 2;
  ctx.strokeRect(width - 280, 92, 190, 48);
  ctx.font = "500 18px Newsreader, Georgia, serif";
  ctx.fillStyle = clay;
  ctx.fillText("UNVERIFIED", width - 246, 124);

  const rows =
    kind === "consent"
      ? [
          ["Visits", "6"],
          ["Duration", "about 16 weeks"],
          ["Payment", "$50"],
          ["Blood draw", "about 2 teaspoons"],
          ["Records kept", "15 years"],
        ]
      : [
          ["Visits", "8"],
          ["Duration", "24 weeks"],
          ["Payment", "$80"],
          ["Blood draw", "about 2 teaspoons"],
          ["Records kept", "15 years"],
        ];

  let y = 330;
  rows.forEach(([label, value], index) => {
    const flagged = index < 3;
    ctx.fillStyle = flagged ? "rgba(141, 78, 56, 0.08)" : "transparent";
    ctx.fillRect(72, y - 28, width - 144, 64);
    ctx.fillStyle = mute;
    ctx.font = "500 18px Newsreader, Georgia, serif";
    ctx.fillText(label.toUpperCase(), 92, y);
    ctx.fillStyle = ink;
    ctx.font = "500 28px Newsreader, Georgia, serif";
    ctx.fillText(value, 340, y + 2);
    y += 78;
  });

  ctx.fillStyle = mute;
  ctx.font = "400 22px Newsreader, Georgia, serif";
  const blurb =
    kind === "consent"
      ? "This form explains the study. It does not record a signature, and it does not decide that someone has consented."
      : "Schedule of assessments. Where this page and the consent disagree, both sentences stay visible until a person reviews them.";
  wrap(ctx, blurb, 72, y + 36, width - 160, 34);

  ctx.strokeStyle = "rgba(26, 29, 28, 0.35)";
  ctx.beginPath();
  ctx.moveTo(72, height - 150);
  ctx.lineTo(width - 72, height - 150);
  ctx.stroke();
  ctx.font = "italic 400 20px Newsreader, Georgia, serif";
  ctx.fillStyle = mute;
  ctx.fillText(kind === "consent" ? "Signature line left blank" : "Not a consent form", 72, height - 112);
}

function makeTexture(kind: "consent" | "protocol") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1320;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the consent sheet.");
  paintSheet(context, kind, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, context, texture };
}

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function makePage(texture: THREE.Texture, width: number, height: number) {
  const group = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0 }),
  );
  face.position.z = 0.02;
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.028),
    new THREE.MeshStandardMaterial({ color: "#e7e1d4", roughness: 1 }),
  );
  group.add(edge, face);
  return { group, face, edge };
}

export function MedicalField({
  reducedMotion,
  progressRef,
}: {
  reducedMotion: boolean;
  progressRef: RefObject<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
    camera.position.set(0.15, 0.05, 7.1);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    scene.add(new THREE.AmbientLight("#243036", 0.55));
    const key = new THREE.SpotLight("#fff4e4", 28, 22, 0.48, 0.45, 1);
    key.position.set(0.4, 3.4, 6.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#b7d4cc", 0.85);
    rim.position.set(-4, 1.4, 2);
    scene.add(rim);

    const consentSheet = makeTexture("consent");
    const protocolSheet = makeTexture("protocol");
    track(consentSheet.texture);
    track(protocolSheet.texture);

    const folio = new THREE.Group();
    scene.add(folio);
    const consent = makePage(consentSheet.texture, 1.56, 2.02);
    const protocol = makePage(protocolSheet.texture, 1.56, 2.02);
    folio.add(protocol.group, consent.group);
    [consent, protocol].forEach((page) => {
      track(page.face.geometry);
      track(page.face.material);
      track(page.edge.geometry);
      track(page.edge.material);
    });

    const shadow = new THREE.Mesh(
      track(new THREE.CircleGeometry(1.35, 48)),
      track(new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.38, depthWrite: false })),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.55;
    folio.add(shadow);

    const redraw = () => {
      paintSheet(consentSheet.context, "consent", consentSheet.canvas.width, consentSheet.canvas.height);
      paintSheet(protocolSheet.context, "protocol", protocolSheet.canvas.width, protocolSheet.canvas.height);
      consentSheet.texture.needsUpdate = true;
      protocolSheet.texture.needsUpdate = true;
    };
    document.fonts?.ready.then(redraw).catch(() => undefined);

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
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    let disposed = false;
    let frame = 0;
    const clock = new THREE.Clock();

    const render = () => {
      if (disposed) return;
      const elapsed = reducedMotion ? 0 : clock.getElapsedTime();
      const progress = Math.min(1, Math.max(0, progressRef.current ?? 0));
      const open = smoothstep((progress - 0.08) / 0.5);
      const spread = smoothstep((progress - 0.58) / 0.22);
      const settle = smoothstep((progress - 0.58) / 0.28);
      sway.x += ((reducedMotion ? 0 : pointer.x) * 0.12 - sway.x) * 0.05;
      sway.y += ((reducedMotion ? 0 : pointer.y) * 0.06 - sway.y) * 0.05;

      folio.position.set(0.48 + open * 0.72, -0.42 + open * 0.55 + Math.sin(elapsed * 0.35) * 0.012, 0);
      folio.scale.setScalar(1 - open * 0.16);
      folio.rotation.set(sway.y * 0.08, sway.x * 0.1, 0);

      const yaw = -0.16 + open * 0.06 + elapsed * 0.006;
      consent.group.position.set(0.12 + settle * 0.15, 0, 0.05);
      consent.group.rotation.set(-0.02, yaw, 0.008);

      protocol.group.position.set(0.12 - spread * 1.42, 0, -0.04);
      protocol.group.rotation.set(-0.02, yaw + spread * 0.4, 0);
      protocol.group.scale.setScalar(0.97 + spread * 0.03);

      shadow.scale.set(1 + open * 0.85, 1, 1);
      shadow.position.x = -open * 0.7;

      camera.position.set(0.2 + sway.x * 0.25, 0.08 - sway.y * 0.12, 7.15 - open * 0.85 + settle * 0.35);
      camera.lookAt(0.05, -0.15, 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    };
  }, [progressRef, reducedMotion]);

  return <canvas ref={canvasRef} className="field-canvas" aria-hidden="true" />;
}
