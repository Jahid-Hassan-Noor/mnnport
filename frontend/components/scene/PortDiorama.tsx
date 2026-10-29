"use client";

import { useEffect, useRef, useState } from "react";
import { webgl2Available } from "@/lib/webgl";

type Props = { variant?: "hero" | "inset"; scene?: number };

export function PortDiorama({ variant = "hero", scene = 1 }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef(scene);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    stage.current = scene;
  }, [scene]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    if (!webgl2Available()) {
      queueMicrotask(() => {
        if (!disposed) setUnavailable(true);
      });
      return () => {
        disposed = true;
      };
    }
    import("three")
      .then((THREE) => {
        const host = mount.current;
        if (disposed || !host) return;

        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: variant === "hero",
            alpha: true,
            powerPreference: "low-power",
          });
        } catch {
          setUnavailable(true);
          return;
        }

        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, variant === "inset" ? 1 : 1.5),
        );
        renderer.setClearColor(0x071923, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        host.appendChild(renderer.domElement);

        const world = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.1, 100);
        camera.position.set(19, 19, 24);
        camera.lookAt(0, 0, 0);
        world.add(new THREE.AmbientLight(0x91b9c3, 1.5));
        const sun = new THREE.DirectionalLight(0xf6cba5, 2.5);
        sun.position.set(-8, 18, 12);
        world.add(sun);
        const fill = new THREE.PointLight(0x45e0d0, 65, 38, 2);
        fill.position.set(8, 5, -5);
        world.add(fill);

        const mat = (color: number, metalness = 0.2, emissive = 0) =>
          new THREE.MeshStandardMaterial({
            color,
            metalness,
            roughness: 0.62,
            emissive,
            emissiveIntensity: emissive ? 0.34 : 0,
          });
        const deep = mat(0x112838),
          slab = mat(0x223f4b),
          pier = mat(0x35545e);
        const road = mat(0x122c38),
          aqua = mat(0x55ddc8, 0.32, 0x0b4a46);
        const amber = mat(0xf2a46e, 0.22, 0x5d260d),
          pale = mat(0xb2cbc9);
        const blue = mat(0x538db8),
          containerMats = [aqua, blue, pale, amber, slab];
        const box = (
          w: number,
          h: number,
          d: number,
          material: InstanceType<typeof THREE.MeshStandardMaterial>,
          x: number,
          y: number,
          z: number,
        ) => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
          mesh.position.set(x, y, z);
          world.add(mesh);
          return mesh;
        };

        box(26, 0.55, 15, deep, 0, -0.64, 0);
        box(24.8, 0.1, 7.3, slab, 0, -0.25, 3.65);
        box(24.8, 0.04, 6.4, road, 0, -0.23, -3.75);
        const grid = new THREE.GridHelper(25, 20, 0x3a7280, 0x244550);
        grid.position.y = -0.18;
        grid.material.transparent = true;
        grid.material.opacity = 0.37;
        world.add(grid);

        for (let i = 0; i < 4; i++) {
          const x = -8.45 + i * 5.62;
          box(4.55, 0.24, 4.6, pier, x, -0.04, -0.95);
          box(4.55, 0.045, 0.12, aqua, x, 0.11, -3.15);
          box(4.5, 0.035, 0.08, amber, x, 0.1, 1.3);
          const craneX = x - 1.05;
          box(0.16, 3.5, 0.16, pale, craneX, 1.8, -1.1);
          box(0.16, 3.5, 0.16, pale, craneX + 1.5, 1.8, -1.1);
          box(2.2, 0.16, 0.16, pale, craneX + 0.75, 3.55, -1.1);
          box(0.2, 0.16, 5.1, pale, craneX + 0.75, 3.55, -3.35);
          box(0.57, 0.42, 0.46, blue, craneX + 1.55, 3.14, -1.45);
          box(0.48, 0.13, 0.5, pale, craneX + 0.75, 3.43, -4.7);
          box(0.06, 1.2, 0.06, amber, craneX + 0.75, 2.9, -4.7);
          box(0.45, 0.18, 0.32, amber, craneX + 0.75, 2.25, -4.7);
          const hook = new THREE.Mesh(
            new THREE.TorusGeometry(0.14, 0.035, 6, 12, Math.PI),
            pale,
          );
          hook.rotation.z = Math.PI;
          hook.position.set(craneX + 0.75, 1.98, -4.7);
          world.add(hook);
          const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 10, 8),
            i === 2 ? amber : aqua,
          );
          beacon.position.set(craneX + 0.75, 3.75, -1.1);
          beacon.userData.incident = i === 2;
          world.add(beacon);
        }

        // Instancing keeps the yard legible in the inset without a draw call per box.
        const containerPositions: [number, number, number][][] =
          containerMats.map(() => []);
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 18; col++) {
            const levels = 1 + ((col * 7 + row * 3) % 3);
            for (let level = 0; level < levels; level++) {
              const colorIndex =
                (col * 3 + row + level * 2) % containerMats.length;
              containerPositions[colorIndex].push([
                -11.1 + col * 1.3,
                0.07 + level * 0.54,
                2.25 + row * 1.26,
              ]);
            }
          }
        }
        const containerGeometry = new THREE.BoxGeometry(1.08, 0.52, 0.83);
        const placement = new THREE.Object3D();
        containerPositions.forEach((positions, colorIndex) => {
          const instances = new THREE.InstancedMesh(
            containerGeometry,
            containerMats[colorIndex],
            positions.length,
          );
          positions.forEach(([x, y, z], index) => {
            placement.position.set(x, y, z);
            placement.updateMatrix();
            instances.setMatrixAt(index, placement.matrix);
          });
          instances.instanceMatrix.needsUpdate = true;
          world.add(instances);
        });

        const ships: InstanceType<typeof THREE.Group>[] = [];
        const shipAt = (
          x: number,
          z: number,
          hue: InstanceType<typeof THREE.MeshStandardMaterial>,
        ) => {
          const group = new THREE.Group();
          const hullShape = new THREE.Shape();
          hullShape.moveTo(-2.65, -0.7);
          hullShape.lineTo(1.9, -0.7);
          hullShape.lineTo(2.65, 0);
          hullShape.lineTo(1.9, 0.7);
          hullShape.lineTo(-2.65, 0.7);
          hullShape.closePath();
          const hull = new THREE.Mesh(
            new THREE.ExtrudeGeometry(hullShape, {
              depth: 0.48,
              bevelEnabled: false,
            }),
            hue,
          );
          hull.rotation.x = -Math.PI / 2;
          group.add(hull);
          const deck = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 0.12, 1.05),
            pale,
          );
          deck.position.set(-0.35, 0.55, 0);
          group.add(deck);
          for (let i = 0; i < 3; i++) {
            const cargo = new THREE.Mesh(
              new THREE.BoxGeometry(0.85, 0.38, 0.7),
              containerMats[i],
            );
            cargo.position.set(-1.25 + i * 0.95, 0.8, 0);
            group.add(cargo);
          }
          group.position.set(x, 0.1, z);
          world.add(group);
          ships.push(group);
        };
        shipAt(-6.1, -5.2, amber);
        shipAt(5.8, -5.7, blue);

        const routePoints = [
          new THREE.Vector3(-10.8, 0.05, 6.3),
          new THREE.Vector3(-4.3, 0.05, 6.3),
          new THREE.Vector3(-4.3, 0.05, 1.4),
          new THREE.Vector3(4.5, 0.05, 1.4),
          new THREE.Vector3(4.5, 0.05, 6.3),
          new THREE.Vector3(10.5, 0.05, 6.3),
        ];
        const routeCurve = new THREE.CatmullRomCurve3(
          routePoints,
          false,
          "catmullrom",
          0.1,
        );
        const routeLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(routeCurve.getPoints(90)),
          new THREE.LineBasicMaterial({
            color: 0x6cf4dc,
            transparent: true,
            opacity: 0.7,
          }),
        );
        world.add(routeLine);
        const mover = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.28, 0.36),
          aqua,
        );
        world.add(mover);

        let reducedScene = -1;
        const resize = () => {
          reducedScene = -1;
          const width = Math.max(1, host.clientWidth),
            height = Math.max(1, host.clientHeight);
          renderer.setSize(width, height, false);
          const aspect = width / height,
            viewHeight = variant === "hero" ? 21 : 20;
          camera.left = (-viewHeight * aspect) / 2;
          camera.right = (viewHeight * aspect) / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
          camera.updateProjectionMatrix();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        let visible = true,
          lastFrame = 0,
          pointerX = 0,
          pointerY = 0;
        const visibility = new IntersectionObserver((entries) => {
          visible = entries[0]?.isIntersecting ?? true;
        });
        visibility.observe(host);
        const onPointerMove = (event: PointerEvent) => {
          const rect = host.getBoundingClientRect();
          pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        };
        const onPointerLeave = () => {
          pointerX = 0;
          pointerY = 0;
        };
        host.addEventListener("pointermove", onPointerMove);
        host.addEventListener("pointerleave", onPointerLeave);
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        );
        renderer.setAnimationLoop((time) => {
          if (!visible || document.hidden) return;
          if (reducedMotion.matches) {
            if (reducedScene === stage.current) return;
            reducedScene = stage.current;
          } else if (time - lastFrame < (variant === "inset" ? 65 : 16)) return;
          lastFrame = time;
          const t = reducedMotion.matches ? 0 : time * 0.001;
          camera.position.x +=
            (19 +
              (reducedMotion.matches ? 0 : pointerX * 2.2) -
              camera.position.x) *
            0.045;
          camera.position.y +=
            (19 -
              (reducedMotion.matches ? 0 : pointerY * 1.3) -
              camera.position.y) *
            0.045;
          camera.lookAt(0, 0, 0);
          ships[0].position.x = -6.1 + Math.sin(t * 0.42) * 0.28;
          ships[1].position.x = 5.8 + Math.sin(t * 0.34 + 1.5) * 0.22;
          mover.position.copy(routeCurve.getPointAt((t * 0.055) % 1));
          mover.position.y += 0.16;
          for (const child of world.children) {
            if (child.userData.incident && child instanceof THREE.Mesh) {
              const active = stage.current >= 4;
              child.scale.setScalar(active ? 1 + Math.sin(t * 5) * 0.35 : 1);
              (
                child.material as InstanceType<
                  typeof THREE.MeshStandardMaterial
                >
              ).color.setHex(active ? 0xff665f : 0x55ddc8);
            }
          }
          renderer.render(world, camera);
        });

        cleanup = () => {
          renderer.setAnimationLoop(null);
          observer.disconnect();
          visibility.disconnect();
          host.removeEventListener("pointermove", onPointerMove);
          host.removeEventListener("pointerleave", onPointerLeave);
          world.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          renderer.forceContextLoss();
          renderer.dispose();
          renderer.domElement.remove();
        };
      })
      .catch(() => {
        if (!disposed) setUnavailable(true);
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [variant]);

  return (
    <section
      className={`port-diorama ${variant}`}
      aria-label="Animated three dimensional model of fictional Selat Terminal"
    >
      <div className="diorama-preview" aria-hidden="true">
        <svg viewBox="0 0 500 280" preserveAspectRatio="xMidYMid meet">
          <path
            d="M35 188L260 87L465 158L238 262Z"
            fill="#173d49"
            stroke="#6eb7b1"
            strokeWidth="3"
          />
          <path d="M78 181L264 103L420 157L235 236Z" fill="#2b5961" />
          {[0, 1, 2, 3].map((index) => (
            <g
              key={index}
              transform={`translate(${109 + index * 69} ${153 - index * 18})`}
            >
              <path
                d="M0 0L53 -19L74 -9L21 11Z"
                fill="#406d72"
                stroke="#91cbc1"
              />
              <path
                d="M25 -4V-48M50 -13V-56M20 -48L59 -62M44 -51L73 -65"
                fill="none"
                stroke="#c6e9df"
                strokeWidth="4"
              />
              <path d="M47 -54V-19" stroke="#dcbf91" strokeWidth="2" />
            </g>
          ))}
          {[0, 1, 2, 3, 4, 5].map((row) =>
            [0, 1, 2, 3, 4, 5, 6].map((column) => (
              <path
                key={`${row}-${column}`}
                d={`M${90 + column * 38 + row * 7} ${195 + row * 8}l24 -10 10 5 -24 10Z`}
                fill={(row + column) % 3 === 0 ? "#8dd6c2" : "#72aeb1"}
                opacity=".82"
              />
            )),
          )}
          <path
            d="M350 83l38 -14 36 12 -38 15Z"
            fill="#b4e1dc"
            stroke="#74b8b2"
            strokeWidth="3"
          />
          <path
            d="M64 124l30 -10 28 9 -31 12Z"
            fill="#b4e1dc"
            stroke="#74b8b2"
            strokeWidth="3"
          />
        </svg>
      </div>
      <div ref={mount} className="diorama-render" aria-hidden="true" />
      <div className="diorama-hud top">
        <span className="diorama-signal" /> DIGITAL TWIN{" "}
        <small>/{String(scene).padStart(2, "0")}</small>
      </div>
      <div className="diorama-hud bottom">
        <strong>SELAT TERMINAL</strong>
        <span>FICTIONAL 3D MODEL</span>
      </div>
      {unavailable && <div className="diorama-unavailable">2D preview</div>}
    </section>
  );
}
