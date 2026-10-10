import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

const paper = "#f3efe4";
const ink = "#1a1d1c";
const clay = "#8d4e38";

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
  ctx.fillStyle = ink;
  ctx.fillText(kind === "consent" ? "INFORMED CONSENT" : "PROTOCOL", 72, 128);

  ctx.font = "500 54px Newsreader, Georgia, serif";
  ctx.fillStyle = ink;
  ctx.fillText(kind === "consent" ? "ICF-AETHER-01" : "PROT-AETHER-01", 72, 196);

  ctx.font = "400 22px Newsreader, Georgia, serif";
  ctx.fillStyle = ink;
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
    ctx.fillStyle = ink;
    ctx.font = "500 18px Newsreader, Georgia, serif";
    ctx.fillText(label.toUpperCase(), 92, y);
    ctx.font = "500 28px Newsreader, Georgia, serif";
    ctx.fillText(value, 340, y + 2);
    ctx.strokeStyle = "rgba(26, 29, 28, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(92, y + 16);
    ctx.lineTo(width - 110, y + 16);
    ctx.stroke();
    y += 78;
  });

  ctx.fillStyle = ink;
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
  ctx.fillStyle = ink;
  ctx.fillText(kind === "consent" ? "Signature line left blank" : "Not a consent form", 72, height - 112);
}

function paintLeaf(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  lines: string[],
) {
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(26, 29, 28, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);
  ctx.fillStyle = ink;
  ctx.fillRect(72, 88, 132, 3);
  ctx.font = "500 22px Newsreader, Georgia, serif";
  ctx.fillText("INFORMED CONSENT", 72, 140);
  ctx.font = "500 48px Newsreader, Georgia, serif";
  ctx.fillText(title, 72, 210);
  ctx.font = "400 26px Newsreader, Georgia, serif";
  let y = 280;
  for (const line of lines) {
    y = wrap(ctx, line, 72, y, width - 170, 40);
    y += 16;
  }
  ctx.strokeStyle = "rgba(26, 29, 28, 0.35)";
  ctx.beginPath();
  ctx.moveTo(72, height - 150);
  ctx.lineTo(width - 72, height - 150);
  ctx.stroke();
  ctx.font = "italic 400 20px Newsreader, Georgia, serif";
  ctx.fillText("Signature line left blank", 72, height - 112);
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

function makeLeafTexture(title: string, lines: string[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1320;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the consent sheet.");
  paintLeaf(context, canvas.width, canvas.height, title, lines);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, context, texture, title, lines };
}

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function makePage(texture: THREE.Texture, width: number, height: number) {
  const group = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, color: "#ffffff", toneMapped: false, side: THREE.DoubleSide }),
  );
  face.position.z = 0.02;
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.028),
    new THREE.MeshBasicMaterial({ color: "#f6f1e6", toneMapped: false }),
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
    const leafSheets = [
      makeLeafTexture("Procedures", [
        "The clinic asks you to come in six times across about sixteen weeks.",
        "A visit takes about two hours.",
      ]),
      makeLeafTexture("Risks", [
        "The form names the risks in plain sentences.",
        "A shorter reading cannot change those words.",
      ]),
      makeLeafTexture("In your words", [
        "Teach-back asks you to explain randomization, withdrawal, and risks.",
        "A yes is not understanding.",
      ]),
    ];
    [consentSheet, protocolSheet, ...leafSheets].forEach((sheet) => track(sheet.texture));

    const folio = new THREE.Group();
    scene.add(folio);
    const consent = makePage(consentSheet.texture, 1.56, 2.02);
    const behind = [protocolSheet, ...leafSheets].map((sheet) => makePage(sheet.texture, 1.56, 2.02));
    const pages = [...behind, consent];
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

    const redraw = () => {
      paintSheet(consentSheet.context, "consent", consentSheet.canvas.width, consentSheet.canvas.height);
      paintSheet(protocolSheet.context, "protocol", protocolSheet.canvas.width, protocolSheet.canvas.height);
      leafSheets.forEach((sheet) => {
        paintLeaf(sheet.context, sheet.canvas.width, sheet.canvas.height, sheet.title, sheet.lines);
        sheet.texture.needsUpdate = true;
      });
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
      sway.x += ((reducedMotion ? 0 : pointer.x) * 0.12 - sway.x) * 0.05;
      sway.y += ((reducedMotion ? 0 : pointer.y) * 0.06 - sway.y) * 0.05;

      const turn = reducedMotion ? 1 : smoothstep(progress / 0.32);
      const fan = smoothstep((progress - 0.28) / 0.42);
      const yaw = -0.95 + turn * 0.8;

      folio.position.set(0.85 - turn * 0.2, -0.02 + Math.sin(elapsed * 0.35) * 0.01, 0);
      folio.scale.setScalar(0.92);
      folio.rotation.set(sway.y * 0.04, yaw + sway.x * 0.06, 0);

      consent.group.position.set(0, 0, 0.1);
      consent.group.rotation.set(0, 0, 0);
      consent.group.scale.setScalar(1);

      const lanes = [
        { restX: -0.028, restZ: 0.055, outX: -0.58, outZ: 0.04 },
        { restX: -0.052, restZ: 0.01, outX: -1.02, outZ: -0.01 },
        { restX: -0.076, restZ: -0.035, outX: -1.4, outZ: -0.055 },
        { restX: -0.1, restZ: -0.08, outX: -1.72, outZ: -0.1 },
      ];
      behind.forEach((page, index) => {
        const lane = lanes[index];
        const t = smoothstep(Math.min(1, Math.max(0, (fan - index * 0.06) / 0.82)));
        page.group.position.set(
          lane.restX + (lane.outX - lane.restX) * t,
          0,
          lane.restZ + (lane.outZ - lane.restZ) * t,
        );
        page.group.rotation.set(0, 0, 0);
        page.group.scale.setScalar(1);
      });

      const facing = 0.34 + turn * 0.66;
      pages.forEach((page, index) => {
        const shadow = shadows[index];
        shadow.position.set(page.group.position.x, -1.12, page.group.position.z + 0.04);
        shadow.scale.set(facing, 0.16, 1);
        (shadow.material as THREE.MeshBasicMaterial).opacity = index === pages.length - 1 ? 0.32 : 0.22;
      });

      camera.position.set(0.15 + sway.x * 0.2, 0.06 - sway.y * 0.08, 7.35 - turn * 0.35);
      camera.lookAt(0.35, -0.05, 0);
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
