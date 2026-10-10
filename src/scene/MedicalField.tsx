import { useEffect, useRef } from "react";
import * as THREE from "three";

const deep = new THREE.Color("#0b1e26");
const mid = new THREE.Color("#1d5c62");
const rim = new THREE.Color("#d7ece5");
const paper = new THREE.Color("#f4f1e8");

function makeSphereMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      colorDeep: { value: deep },
      colorMid: { value: mid },
      colorRim: { value: rim },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 colorDeep;
      uniform vec3 colorMid;
      uniform vec3 colorRim;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.15);
        float light = max(dot(normal, normalize(vec3(-0.35, 0.55, 1.0))), 0.0);
        float band = smoothstep(0.15, 0.85, normal.y * 0.5 + 0.5);
        vec3 color = mix(colorDeep, colorMid, light * 0.85 + band * 0.15);
        color = mix(color, colorRim, fresnel * 0.85);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function makeAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: {
      colorRim: { value: rim },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 colorRim;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.8);
        gl_FragColor = vec4(colorRim, fresnel * 0.55);
      }
    `,
  });
}

type Node = {
  position: THREE.Vector3;
  phase: number;
  speed: number;
};

export function MedicalField({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0.05, 7.6);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    const globe = new THREE.Group();
    scene.add(globe);

    const sphere = new THREE.Mesh(
      track(new THREE.SphereGeometry(1.38, 72, 72)),
      track(makeSphereMaterial()),
    );
    globe.add(sphere);

    const lineMaterial = track(
      new THREE.LineBasicMaterial({ color: "#d7ece5", transparent: true, opacity: 0.28 }),
    );
    const radius = 1.4;
    for (let lat = 1; lat < 7; lat += 1) {
      const phi = (lat / 7) * Math.PI;
      const y = Math.cos(phi) * radius;
      const ringRadius = Math.sin(phi) * radius;
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 96; step += 1) {
        const theta = (step / 96) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * ringRadius, y, Math.sin(theta) * ringRadius));
      }
      globe.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(points)), lineMaterial));
    }
    for (let lon = 0; lon < 10; lon += 1) {
      const theta = (lon / 10) * Math.PI;
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 80; step += 1) {
        const phi = (step / 80) * Math.PI;
        points.push(
          new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta),
          ),
        );
      }
      globe.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(points)), lineMaterial));
    }

    const atmosphere = new THREE.Mesh(
      track(new THREE.SphereGeometry(1.58, 48, 48)),
      track(makeAtmosphereMaterial()),
    );
    globe.add(atmosphere);

    const markerMaterial = track(
      new THREE.MeshBasicMaterial({ color: paper, transparent: true, opacity: 0.9 }),
    );
    const markerGeometry = track(new THREE.SphereGeometry(0.018, 8, 8));
    const clinics = [
      [51.5, -0.12],
      [40.7, -74.0],
      [48.8, 2.3],
      [35.7, 139.7],
      [-33.9, 18.4],
      [1.3, 103.8],
      [19.4, -99.1],
      [-23.5, -46.6],
      [55.7, 37.6],
      [30.0, 31.2],
    ];
    for (const [lat, lon] of clinics) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(
        -1.41 * Math.sin(phi) * Math.cos(theta),
        1.41 * Math.cos(phi),
        1.41 * Math.sin(phi) * Math.sin(theta),
      );
      globe.add(marker);
    }

    const traces = Array.from({ length: 6 }, (_, index) => ({
      y: -1.55 + index * 0.62,
      phase: index * 1.3,
      amplitude: 0.08 + (index % 3) * 0.035,
      speed: 0.35 + index * 0.04,
      z: -0.4 + (index % 2) * 0.9,
    }));
    const traceLines = traces.map(() => {
      const geometry = track(new THREE.BufferGeometry());
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(90 * 3), 3));
      const material = track(
        new THREE.LineBasicMaterial({
          color: paper,
          transparent: true,
          opacity: 0.34,
        }),
      );
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      return line;
    });

    const nodes: Node[] = Array.from({ length: 22 }, (_, index) => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 7.2,
        (Math.random() - 0.5) * 4.2,
        (Math.random() - 0.5) * 2.2,
      ),
      phase: index * 0.7,
      speed: 0.15 + Math.random() * 0.2,
    }));
    const nodeMesh = new THREE.InstancedMesh(
      track(new THREE.BoxGeometry(0.035, 0.035, 0.035)),
      track(new THREE.MeshBasicMaterial({ color: "#d7ece5" })),
      nodes.length,
    );
    scene.add(nodeMesh);
    const linkArray = new Float32Array(240 * 6);
    const linkGeometry = track(new THREE.BufferGeometry());
    linkGeometry.setAttribute("position", new THREE.BufferAttribute(linkArray, 3));
    const links = new THREE.LineSegments(
      linkGeometry,
      track(new THREE.LineBasicMaterial({ color: "#387d73", transparent: true, opacity: 0.28 })),
    );
    scene.add(links);
    const dummy = new THREE.Object3D();

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
      globe.rotation.y = elapsed * 0.12;
      globe.rotation.x = Math.sin(elapsed * 0.15) * 0.04;

      traces.forEach((trace, index) => {
        const attribute = traceLines[index].geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let point = 0; point < 90; point += 1) {
          const x = -6.2 + (point / 89) * 12.4;
          const spike = Math.sin(x * 3.2 + elapsed * trace.speed + trace.phase) * trace.amplitude;
          const beat = Math.abs(((x * 0.35 + elapsed * 0.15 + trace.phase) % 1) - 0.5) < 0.04 ? 0.16 : 0;
          attribute.setXYZ(point, x, trace.y + spike - beat, trace.z);
        }
        attribute.needsUpdate = true;
      });

      const current: THREE.Vector3[] = [];
      nodes.forEach((node, index) => {
        const drift = reducedMotion ? 0 : Math.sin(elapsed * node.speed + node.phase) * 0.12;
        dummy.position.set(node.position.x + drift, node.position.y, node.position.z);
        dummy.updateMatrix();
        nodeMesh.setMatrixAt(index, dummy.matrix);
        current.push(dummy.position.clone());
      });
      nodeMesh.instanceMatrix.needsUpdate = true;
      let vertex = 0;
      for (let i = 0; i < current.length; i += 1) {
        for (let j = i + 1; j < current.length; j += 1) {
          if (current[i].distanceTo(current[j]) > 1.7 || vertex + 6 > linkArray.length) continue;
          linkArray[vertex] = current[i].x;
          linkArray[vertex + 1] = current[i].y;
          linkArray[vertex + 2] = current[i].z;
          linkArray[vertex + 3] = current[j].x;
          linkArray[vertex + 4] = current[j].y;
          linkArray[vertex + 5] = current[j].z;
          vertex += 6;
        }
      }
      linkGeometry.setDrawRange(0, vertex / 3);
      (linkGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

      renderer.render(scene, camera);
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="field-canvas" aria-hidden="true" />;
}
