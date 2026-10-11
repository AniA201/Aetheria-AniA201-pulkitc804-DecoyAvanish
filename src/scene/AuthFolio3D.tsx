import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { sections, study } from "../data/study";

const sample = sections[1];

function wrap(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, step: number) {
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > width) {
      context.fillText(line, x, y);
      y += step;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) context.fillText(line, x, y);
}

function makeTexture(side: "original" | "plain", anisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1060;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the sample study page.");

  context.fillStyle = "#fffcf3";
  context.fillRect(0, 0, 800, 1060);
  context.strokeStyle = "#8ba9a0";
  context.lineWidth = 3;
  context.strokeRect(26, 26, 748, 1008);
  context.fillStyle = "#0d5b58";
  context.fillRect(67, 83, 144, 4);
  context.font = "600 26px Newsreader, Georgia, serif";
  context.fillText(study.sponsor.toUpperCase(), 67, 133);
  context.fillStyle = "#53655f";
  context.font = "400 26px Newsreader, Georgia, serif";
  context.fillText("EPISODIC MIGRAINE PREVENTION · SAMPLE", 67, 183);
  context.fillStyle = "#0d5b58";
  context.font = "500 79px Newsreader, Georgia, serif";
  context.fillText(side === "original" ? "Original form." : "In plain words.", 67, 302, 650);
  context.fillRect(67, 344, 666, 2);
  context.fillStyle = "#0d5b58";
  context.font = "600 24px Newsreader, Georgia, serif";
  context.fillText("02 / RISKS AND POSSIBLE BENEFITS", 67, 399);
  context.fillStyle = "#243b37";
  context.font = "400 47px Newsreader, Georgia, serif";
  const words = side === "original"
    ? sample.original.split(". ").slice(0, 2).join(". ") + "."
    : sample.plain.split(". ").slice(0, 2).join(". ") + ".";
  wrap(context, words, 67, 476, 660, 62);
  context.strokeStyle = "#a8bdb4";
  context.beginPath();
  context.moveTo(67, 920);
  context.lineTo(733, 920);
  context.stroke();
  context.fillStyle = "#0d5b58";
  context.font = "500 24px Newsreader, Georgia, serif";
  context.fillText(`${sample.citation} · ${sample.page}`, 67, 963, 620);
  context.font = "600 19px Newsreader, Georgia, serif";
  context.fillText(side === "original" ? "SOURCE" : "SHORTER READING", 67, 1001);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(16, anisotropy);
  return texture;
}

export function AuthFolio3D({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shownRef = useRef(0);
  const [shown, setShown] = useState<0 | 1>(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 20);
    camera.position.set(0, 0, 5.5);
    const page = new THREE.Group();
    scene.add(page);
    const edgeGeometry = new THREE.BoxGeometry(1.78, 2.38, 0.045);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: "#eee9dc" });
    page.add(new THREE.Mesh(edgeGeometry, edgeMaterial));
    const faceGeometry = new THREE.PlaneGeometry(1.78, 2.38);
    const originalTexture = makeTexture("original", renderer.capabilities.getMaxAnisotropy());
    const plainTexture = makeTexture("plain", renderer.capabilities.getMaxAnisotropy());
    const frontMaterial = new THREE.MeshBasicMaterial({ map: originalTexture, toneMapped: false });
    const backMaterial = new THREE.MeshBasicMaterial({ map: plainTexture, toneMapped: false });
    const front = new THREE.Mesh(faceGeometry, frontMaterial);
    front.position.z = 0.026;
    const back = new THREE.Mesh(faceGeometry, backMaterial);
    back.position.z = -0.026;
    back.rotation.y = Math.PI;
    page.add(front, back);

    const shadowGeometry = new THREE.CircleGeometry(0.77, 48);
    const shadowMaterial = new THREE.MeshBasicMaterial({ color: "#073d3a", transparent: true, opacity: 0.23, depthWrite: false });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.position.set(0.18, -1.35, -0.48);
    shadow.scale.set(1.35, 0.15, 1);
    scene.add(shadow);

    const pointer = { x: 0, y: 0, near: 0 };
    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === "touch") return;
      const bounds = canvas.getBoundingClientRect();
      const reach = 90;
      const near = event.clientX >= bounds.left - reach && event.clientX <= bounds.right + reach
        && event.clientY >= bounds.top - reach && event.clientY <= bounds.bottom + reach;
      pointer.near = near ? 1 : 0;
      pointer.x = near ? THREE.MathUtils.clamp((event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width * 0.65), -1, 1) : 0;
      pointer.y = near ? THREE.MathUtils.clamp((event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height * 0.65), -1, 1) : 0;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

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
    const clock = new THREE.Clock();
    const render = () => {
      const t = clock.getElapsedTime();
      const settle = reducedMotion ? 1 : 0.105;
      const targetY = shownRef.current * Math.PI + (reducedMotion ? 0 : -0.10 + pointer.x * 0.21);
      page.rotation.y += (targetY - page.rotation.y) * settle;
      page.rotation.x += ((reducedMotion ? 0 : -pointer.y * 0.14) - page.rotation.x) * settle;
      page.rotation.z += ((reducedMotion ? 0 : pointer.x * 0.035) - page.rotation.z) * settle;
      const lift = reducedMotion ? 0 : pointer.near * 0.15;
      page.position.z += (lift - page.position.z) * settle;
      page.position.y += ((reducedMotion ? 0 : Math.sin(t * 1.1) * 0.018) - page.position.y) * 0.045;
      shadow.position.x += ((0.18 - pointer.x * 0.22) - shadow.position.x) * settle;
      shadow.position.y += ((-1.35 + pointer.y * 0.045) - shadow.position.y) * settle;
      shadowMaterial.opacity += ((0.23 - lift * 0.35) - shadowMaterial.opacity) * settle;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      originalTexture.dispose();
      plainTexture.dispose();
      faceGeometry.dispose();
      edgeGeometry.dispose();
      shadowGeometry.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      edgeMaterial.dispose();
      shadowMaterial.dispose();
      renderer.dispose();
    };
  }, [reducedMotion]);

  function turn() {
    setShown((current) => {
      const next = current === 0 ? 1 : 0;
      shownRef.current = next;
      return next;
    });
  }

  return (
    <button
      className="auth-folio-art auth-folio-3d"
      type="button"
      onClick={turn}
      aria-label={shown === 0 ? "Turn sample page to see a shorter reading" : "Turn sample page to see the original form"}
    >
      {failed ? (
        <span className="auth-folio-fallback"><strong>{shown === 0 ? "Original form" : "In plain words"}</strong><span>{shown === 0 ? sample.original : sample.plain}</span></span>
      ) : <canvas ref={canvasRef} aria-hidden="true" />}
      <span className="auth-folio-turn-hint">{shown === 0 ? "Turn to plain words ↗" : "Turn to original ↗"}</span>
    </button>
  );
}
