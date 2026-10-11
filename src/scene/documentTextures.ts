import * as THREE from "three";
import { facts, sections, study } from "../data/study";

const WIDTH = 1024;
const HEIGHT = 1320;
const SCALE = 2;
const paper = "#f8f6ee";
const ink = "#1c2927";
const teal = "#0d5b58";

type PageDrawing = (context: CanvasRenderingContext2D) => void;

function wrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? line + " " + word : word;
    if (line && context.measureText(next).width > maxWidth) {
      context.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) context.fillText(line, x, y);
  return y + lineHeight;
}

function pageFrame(context: CanvasRenderingContext2D, kind: string, tab: string, accent: string, tint = paper) {
  context.fillStyle = tint;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = "#93a49c";
  context.lineWidth = 3;
  context.strokeRect(36, 36, WIDTH - 72, HEIGHT - 72);

  context.fillStyle = accent;
  context.fillRect(72, 83, 150, 4);
  context.font = "600 22px Newsreader, Georgia, serif";
  context.fillText(study.sponsor.toUpperCase(), 72, 127);
  context.fillStyle = ink;
  context.font = "500 24px Newsreader, Georgia, serif";
  context.fillText(kind.toUpperCase(), 72, 174);

  context.fillStyle = accent;
  context.fillRect(WIDTH - 148, 38, 110, HEIGHT - 76);
  context.save();
  context.translate(WIDTH - 72, 212);
  context.rotate(Math.PI / 2);
  context.font = "600 37px Newsreader, Georgia, serif";
  context.fillStyle = "#f8f6ee";
  context.fillText(tab.toUpperCase(), 0, 0);
  context.restore();
}

function footer(context: CanvasRenderingContext2D, label: string) {
  context.strokeStyle = "#aab8af";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, HEIGHT - 146);
  context.lineTo(WIDTH - 168, HEIGHT - 146);
  context.stroke();
  context.font = "500 22px Newsreader, Georgia, serif";
  context.fillStyle = ink;
  context.fillText(label, 72, HEIGHT - 104);
  context.fillStyle = teal;
  context.fillText("SYNTHETIC SAMPLE", WIDTH - 414, HEIGHT - 104);
}

function sectionPage(context: CanvasRenderingContext2D, index: number) {
  const names = ["Read", "Ask", "Feedback", "Review"];
  const accent = teal;
  pageFrame(context, "Aetheria / sample study", names[index], accent, "#fffdf8");
  context.fillStyle = accent;
  context.font = "500 98px Newsreader, Georgia, serif";
  context.fillText(names[index].toUpperCase() + ".", 72, 280, WIDTH - 270);
  context.font = "500 22px Newsreader, Georgia, serif";
  context.fillText(`${String(index + 1).padStart(2, "0")} / 04`, 72, 335);
  context.beginPath();
  context.arc(762, 296, 29, 0, Math.PI * 2);
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.stroke();
  context.font = "600 22px Newsreader, Georgia, serif";
  context.fillText(String(index + 1).padStart(2, "0"), 748, 305);
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, 365);
  context.lineTo(WIDTH - 184, 365);
  context.stroke();

  let y = 430;
  let blockNumber = 0;
  const block = (heading: string, body: string, source?: string) => {
    blockNumber += 1;
    context.fillStyle = "#efe9f4";
    context.fillRect(72, y - 28, 38, 38);
    context.fillStyle = accent;
    context.font = "600 19px Newsreader, Georgia, serif";
    context.fillText(String(blockNumber).padStart(2, "0"), 78, y - 2);
    context.fillStyle = accent;
    context.font = "600 36px Newsreader, Georgia, serif";
    context.fillText(heading, 124, y, WIDTH - 315);
    context.fillStyle = ink;
    context.font = "400 35px Newsreader, Georgia, serif";
    y = wrappedText(context, body, 72, y + 48, WIDTH - 268, 47);
    if (source) {
      context.fillStyle = "#586962";
      context.font = "500 19px Newsreader, Georgia, serif";
      context.fillText(source, 72, y + 4, WIDTH - 260);
      y += 35;
    }
    context.strokeStyle = "#d8cddd";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(72, y + 15);
    context.lineTo(WIDTH - 185, y + 15);
    context.stroke();
    y += 56;
  };

  if (index === 0) {
    block("Start with the source", "Read the consent form alongside the study plan. Keep the original words in view while you check the plain reading.");
    block("A difference to notice", "The consent form says 6 clinic visits. The study plan says 8. Ask the study team which number is right.", facts[0].consentSource);
  } else if (index === 1) {
    block("How many visits?", "The consent form says 6 visits over about 16 weeks, around 2 hours each. The study plan says 8 visits.", sections[0].citation + " · " + sections[0].page);
    block("Can I leave?", "Yes. You can leave later without losing regular care from your own doctor.", sections[2].citation + " · " + sections[2].page);
    block("What will I pay?", "The study drug and required visits cost you nothing. The form says $50 after each completed visit.", sections[3].citation + " · " + sections[3].page);
  } else if (index === 2) {
    block("Check what you understood", "Can you choose whether you get Aetherol or placebo?");
    block("No. Chance decides.", "Neither you nor the study doctor knows your group while the study is going on. If that surprises you, ask before you decide.", sections[0].citation + " · " + sections[0].page);
  } else {
    for (const fact of facts.filter((item) => item.kind === "confirmed-textual-difference")) {
      block(fact.label, `Consent: ${fact.consentValue}. Study plan: ${fact.protocolValue}.`);
    }
    block("Before relying on either", "The study team needs to resolve these differences.");
  }
  footer(context, "AETHER-01 · demonstration only");
}

function createTexture(draw: PageDrawing, anisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the consent sheet.");
  context.scale(SCALE, SCALE);
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return {
    texture,
    redraw: () => {
      draw(context);
      texture.needsUpdate = true;
    },
  };
}

export function makeFolioTextures(maxAnisotropy: number) {
  const anisotropy = Math.min(16, maxAnisotropy);
  const all = [0, 1, 2, 3].map((index) => createTexture((context) => sectionPage(context, index), anisotropy));
  return {
    pages: all,
    textures: all.map((page) => page.texture),
    redraw: () => all.forEach((page) => page.redraw()),
  };
}
