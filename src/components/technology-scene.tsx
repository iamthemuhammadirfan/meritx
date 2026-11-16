"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type * as Three from "three";
import { Pause, Play } from "lucide-react";

export function TechnologyScene() {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    async function create() {
      const [T, { RoundedBoxGeometry }] = await Promise.all([
        import("three"),
        import("three/addons/geometries/RoundedBoxGeometry.js"),
      ]);
      if (cancelled || !element) return;
      let renderer: Three.WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.domElement.setAttribute("aria-hidden", "true");
      element.appendChild(renderer.domElement);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(36, 1, 0.1, 60);
      camera.position.set(0, 2.2, 10.3);
      camera.lookAt(0, 0.1, 0);
      scene.add(new T.HemisphereLight(0xe9f5ff, 0x53598e, 3));
      const key = new T.DirectionalLight(0xffffff, 5);
      key.position.set(3, 6, 5);
      scene.add(key);
      const orange = new T.PointLight(0xffa13a, 18, 15);
      orange.position.set(-3, 2, 2);
      scene.add(orange);
      const blue = new T.PointLight(0x45baff, 22, 15);
      blue.position.set(3, -1, 2);
      scene.add(blue);
      const assembly = new T.Group();
      assembly.rotation.set(0.03, -0.34, -0.02);
      scene.add(assembly);
      const graphite = new T.MeshStandardMaterial({
        color: 0x173550,
        metalness: 0.65,
        roughness: 0.27,
      });
      const silver = new T.MeshStandardMaterial({
        color: 0xe2e9f4,
        metalness: 0.65,
        roughness: 0.25,
      });
      const white = new T.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.12,
        roughness: 0.3,
      });
      const black = new T.MeshStandardMaterial({
        color: 0x071424,
        metalness: 0.35,
        roughness: 0.18,
      });
      const amber = new T.MeshStandardMaterial({
        color: 0xff9419,
        emissive: 0xff5c00,
        emissiveIntensity: 0.4,
        roughness: 0.3,
      });
      const cyan = new T.MeshStandardMaterial({
        color: 0x39c7ff,
        emissive: 0x16a7ff,
        emissiveIntensity: 1.5,
      });
      function box(
        w: number,
        h: number,
        d: number,
        mat: Three.Material,
        x: number,
        y: number,
        z: number,
        parent: Three.Group = assembly,
      ) {
        const mesh = new T.Mesh(
          new RoundedBoxGeometry(w, h, d, 2, Math.min(0.075, h / 5)),
          mat,
        );
        mesh.position.set(x, y, z);
        parent.add(mesh);
        return mesh;
      }

      // A server stack, complete with drive bays, vents and status lights.
      const core = new T.Group();
      assembly.add(core);
      const plinth = new T.Mesh(
        new T.CylinderGeometry(1.6, 1.68, 0.14, 80),
        silver,
      );
      plinth.position.y = -0.85;
      core.add(plinth);
      for (let i = 0; i < 3; i++) {
        const y = -0.55 + i * 0.43;
        box(2.35, 0.34, 1.45, graphite, 0, y, 0, core);
        for (let j = 0; j < 4; j++) {
          box(0.42, 0.2, 0.025, black, -0.81 + j * 0.49, y, 0.737, core);
          box(
            0.23,
            0.025,
            0.04,
            silver,
            -0.81 + j * 0.49,
            y + 0.025,
            0.758,
            core,
          );
          box(
            0.03,
            0.035,
            0.035,
            cyan,
            -0.94 + j * 0.49,
            y - 0.065,
            0.76,
            core,
          );
        }
        box(0.055, 0.19, 0.08, amber, 1.08, y, 0.77, core);
      }
      box(1.5, 0.08, 0.9, silver, 0, 0.6, 0, core);

      // Laptop: a tilted display and keyboard deck.
      const laptop = new T.Group();
      laptop.position.set(2.2, 1.05, -0.15);
      laptop.rotation.set(0.1, -0.35, 0.08);
      assembly.add(laptop);
      box(1.36, 0.065, 0.92, silver, 0, -0.3, 0.17, laptop);
      const display = box(1.34, 0.88, 0.065, graphite, 0, 0.1, -0.2, laptop);
      display.rotation.x = -0.18;
      const screen = box(
        1.17,
        0.7,
        0.02,
        new T.MeshStandardMaterial({
          color: 0x8ecaff,
          emissive: 0x1979d9,
          emissiveIntensity: 0.3,
          roughness: 0.2,
        }),
        0,
        0.1,
        -0.145,
        laptop,
      );
      screen.rotation.x = -0.18;
      box(0.7, 0.015, 0.27, graphite, 0, -0.26, 0.1, laptop);
      box(0.38, 0.015, 0.17, white, 0, -0.255, 0.43, laptop);

      // Dome camera with mounting base, lens and housing.
      const cctv = new T.Group();
      cctv.position.set(-2.1, 1.55, -0.3);
      cctv.rotation.z = -0.12;
      assembly.add(cctv);
      const mount = new T.Mesh(
        new T.CylinderGeometry(0.48, 0.48, 0.16, 48),
        white,
      );
      cctv.add(mount);
      const dome = new T.Mesh(
        new T.SphereGeometry(0.4, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
        graphite,
      );
      dome.rotation.x = Math.PI;
      dome.position.y = -0.08;
      cctv.add(dome);
      const lens = new T.Mesh(
        new T.CylinderGeometry(0.14, 0.17, 0.17, 32),
        black,
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, -0.26, 0.29);
      cctv.add(lens);
      const glass = new T.Mesh(new T.SphereGeometry(0.1, 24, 16), cyan);
      glass.scale.z = 0.35;
      glass.position.set(0, -0.26, 0.39);
      cctv.add(glass);

      // An edge network switch and Wi-Fi antenna.
      const network = new T.Group();
      network.position.set(-2.1, -0.78, 1);
      network.rotation.y = 0.2;
      assembly.add(network);
      box(1.35, 0.23, 0.73, white, 0, 0, 0, network);
      for (let i = 0; i < 6; i++) {
        box(0.12, 0.08, 0.02, black, -0.48 + 0.19 * i, 0.015, 0.38, network);
      }
      box(0.035, 0.63, 0.035, graphite, -0.45, 0.4, -0.2, network);
      const paths = [
        new T.CatmullRomCurve3([
          new T.Vector3(-1.9, 1.3, -0.3),
          new T.Vector3(-1.5, 1.4, 0.6),
          new T.Vector3(-0.7, 0.6, 1),
        ]),
        new T.CatmullRomCurve3([
          new T.Vector3(1, 0.4, 0.7),
          new T.Vector3(1.9, 0.5, 0.8),
          new T.Vector3(2.2, 0.85, 0),
        ]),
        new T.CatmullRomCurve3([
          new T.Vector3(-0.65, -0.7, 1),
          new T.Vector3(-1.2, -1.15, 1.5),
          new T.Vector3(-2.1, -0.8, 1),
        ]),
      ];
      const pulses: Three.Mesh[] = [];
      paths.forEach((curve, i) => {
        assembly.add(
          new T.Mesh(
            new T.TubeGeometry(curve, 50, 0.017, 8, false),
            new T.MeshStandardMaterial({
              color: i === 1 ? 0x00a3ff : 0xffa028,
              roughness: 0.4,
              metalness: 0.3,
            }),
          ),
        );
        const pulse = new T.Mesh(
          new T.SphereGeometry(0.045, 12, 10),
          i === 1 ? cyan : amber,
        );
        assembly.add(pulse);
        pulses.push(pulse);
      });

      let visible = true;
      let pointerX = 0;
      let pointerY = 0;
      let time = 0;
      let previous = 0;
      const resize = new ResizeObserver(() => {
        const { width, height } = element.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        assembly.scale.setScalar(Math.min(1, camera.aspect * 0.91));
        camera.updateProjectionMatrix();
      });
      resize.observe(element);
      const observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
        },
        { threshold: 0.05 },
      );
      observer.observe(element);
      const move = (event: PointerEvent) => {
        const r = element.getBoundingClientRect();
        pointerX = ((event.clientX - r.left) / r.width - 0.5) * 0.3;
        pointerY = ((event.clientY - r.top) / r.height - 0.5) * 0.1;
      };
      const leave = () => {
        pointerX = 0;
        pointerY = 0;
      };
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerleave", leave);
      renderer.setSize(element.clientWidth, element.clientHeight);
      camera.aspect = element.clientWidth / element.clientHeight;
      assembly.scale.setScalar(Math.min(1, camera.aspect * 0.91));
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      setReady(true);
      renderer.setAnimationLoop((now) => {
        const delta = Math.min((now - previous) / 1000, 0.05);
        previous = now;
        if (!visible || document.hidden || pause.current || reduced.matches)
          return;
        time += delta;
        assembly.rotation.y +=
          (-0.34 +
            pointerX +
            Math.sin(time * 0.18) * 0.08 -
            assembly.rotation.y) *
          0.035;
        assembly.rotation.x += (0.03 + pointerY - assembly.rotation.x) * 0.035;
        laptop.position.y = 1.05 + Math.sin(time * 0.8) * 0.08;
        cctv.position.y = 1.55 + Math.sin(time * 0.8 + 2) * 0.07;
        paths.forEach((curve, i) => {
          pulses[i].position.copy(curve.getPoint((time * 0.18 + i / 3) % 1));
        });
        renderer.render(scene, camera);
      });
      dispose = () => {
        renderer.setAnimationLoop(null);
        resize.disconnect();
        observer.disconnect();
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerleave", leave);
        scene.traverse((object) => {
          if (object instanceof T.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            materials.forEach((m) => m.dispose());
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (cancelled) dispose();
    }
    const visible = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visible.disconnect();
          create().catch(() => {
            /* The generated visual remains as the fallback. */
          });
        }
      },
      { rootMargin: "200px" },
    );
    visible.observe(element);
    return () => {
      cancelled = true;
      visible.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <div className={`technology-scene ${ready ? "scene-ready" : ""}`}>
      <Image
        className="scene-fallback"
        src="/images/technology-suite.webp"
        alt="Illustrative technology suite of servers, networking equipment, a security camera and a laptop"
        width={1536}
        height={1024}
        loading="eager"
        fetchPriority="high"
      />
      <div
        className="scene-canvas"
        ref={host}
        role="img"
        aria-label="Interactive 3D illustration connecting servers, a laptop, a security camera and network equipment"
      />
      <span className="scene-label scene-label-top">
        <i /> Connected by design
      </span>
      <span className="scene-label scene-label-bottom">
        One partner. Every connection.
      </span>
      {ready && (
        <button
          className="scene-control"
          type="button"
          aria-label={paused ? "Play 3D animation" : "Pause 3D animation"}
          aria-pressed={paused}
          onClick={() => {
            pause.current = !paused;
            setPaused(!paused);
          }}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          <span>{paused ? "Play motion" : "Pause motion"}</span>
        </button>
      )}
    </div>
  );
}
