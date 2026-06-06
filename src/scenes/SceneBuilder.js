import * as THREE from 'three';

export class SceneBuilder {
  static createLighting(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.8);
    sun.position.set(5, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xa0c0ff, 0.6);
    fill.position.set(-5, 5, -3);
    scene.add(fill);

    const back = new THREE.DirectionalLight(0xffd080, 0.4);
    back.position.set(0, 3, -8);
    scene.add(back);

    return { ambient, sun, fill };
  }

  static createGround(color = 0x4a7c3f, size = 40, options = {}) {
    const segments = options.segments ?? 44;
    const roughness = options.roughness ?? 0.16;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const edge = Math.max(Math.abs(x), Math.abs(y)) / (size / 2);
      const height = (Math.sin(x * 0.55) + Math.cos(y * 0.45) + Math.sin((x + y) * 0.22)) * roughness * (0.25 + edge * 0.55);
      pos.setZ(i, height);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
  }

  static createPath(scene, points, width = 1.2, color = 0x8a7659) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i];
      const [x2, z2] = points[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.sqrt(dx * dx + dz * dz);
      const geo = new THREE.PlaneGeometry(width, length, 4, 16);
      const path = new THREE.Mesh(geo, mat);
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = -Math.atan2(dx, dz);
      path.position.set((x1 + x2) / 2, 0.035, (z1 + z2) / 2);
      path.receiveShadow = true;
      scene.add(path);
    }
  }

  static createAnimatedWater(width = 30, depth = 15, color = 0x1a6090) {
    const geo = new THREE.PlaneGeometry(width, depth, 36, 18);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.22,
      metalness: 0.45,
      transparent: true,
      opacity: 0.86,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    const basePositions = Array.from(geo.attributes.position.array);
    mesh.userData.tick = (delta, object) => {
      object.userData.time = (object.userData.time || 0) + delta;
      const pos = object.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = basePositions[i * 3];
        const y = basePositions[i * 3 + 1];
        pos.setZ(i, Math.sin(x * 0.8 + object.userData.time * 1.7) * 0.06 + Math.cos(y * 0.9 + object.userData.time * 1.2) * 0.04);
      }
      pos.needsUpdate = true;
      object.geometry.computeVertexNormals();
    };
    return mesh;
  }

  static createBanner(color = 0x1a3a9a, trim = 0xc9a84c) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 2.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.7 })
    );
    pole.position.y = 1.4;
    pole.castShadow = true;
    group.add(pole);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 0.68, 12, 4),
      new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.55 })
    );
    flag.position.set(0.55, 2.22, 0);
    flag.castShadow = true;
    flag.userData.tick = (delta, object) => {
      object.userData.time = (object.userData.time || 0) + delta;
      const pos = object.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin(object.userData.time * 3 + x * 5) * 0.035);
      }
      pos.needsUpdate = true;
      object.geometry.computeVertexNormals();
    };
    group.add(flag);

    const finial = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 8),
      new THREE.MeshStandardMaterial({ color: trim, metalness: 0.6, roughness: 0.25 })
    );
    finial.position.y = 2.85;
    group.add(finial);
    return group;
  }

  static createAtmosphere(scene, options = {}) {
    const count = options.count ?? 160;
    const spread = options.spread ?? 42;
    const height = options.height ?? 8;
    const color = options.color ?? 0xffffff;
    const size = options.size ?? 0.08;
    const speed = options.speed ?? 0.35;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * height + 0.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: options.opacity ?? 0.55,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    points.userData.tick = (delta, object) => {
      const pos = object.geometry.attributes.position;
      object.userData.time = (object.userData.time || 0) + delta;
      for (let i = 0; i < count; i++) {
        const y = pos.getY(i) - delta * speed * (0.35 + (i % 5) * 0.08);
        const sway = Math.sin(object.userData.time + phases[i]) * delta * speed;
        pos.setX(i, pos.getX(i) + sway);
        pos.setY(i, y < 0.2 ? height : y);
      }
      pos.needsUpdate = true;
    };
    scene.add(points);
    return points;
  }

  static createInstancedFoliage(scene, options = {}) {
    const count = options.count ?? 90;
    const spread = options.spread ?? 36;
    const bladeGeo = new THREE.ConeGeometry(0.035, 0.45, 5);
    const bladeMat = new THREE.MeshStandardMaterial({ color: options.color ?? 0x365f2f, roughness: 1 });
    const mesh = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set((Math.random() - 0.5) * spread, 0.22, (Math.random() - 0.5) * spread);
      dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
      const scale = 0.65 + Math.random() * 0.75;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  }

  static createSkybox(scene, topColor = 0x87ceeb, bottomColor = 0xd4e8c2) {
    const skyGeo = new THREE.SphereGeometry(80, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(topColor) },
        bottomColor: { value: new THREE.Color(bottomColor) },
        offset: { value: 15 },
        exponent: { value: 0.4 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }`,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
    return sky;
  }

  static createBuilding(w, h, d, color = 0xc8b89a) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  static createTree(x, z) {
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.4;
    trunk.castShadow = true;
    group.add(trunk);

    const leafColors = [0x2d6a2d, 0x3a7a3a, 0x4a8a4a];
    [[0, 1.6, 0.7], [0, 2.1, 0.5], [0, 2.5, 0.35]].forEach(([py, pr], i) => {
      const leafGeo = new THREE.SphereGeometry(pr, 10, 8);
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColors[i % 3], roughness: 0.9 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = py;
      leaf.castShadow = true;
      group.add(leaf);
    });

    group.position.set(x, 0, z);
    return group;
  }

  static addFog(scene, color = 0xd4e8c2, near = 20, far = 60) {
    scene.fog = new THREE.Fog(color, near, far);
  }
}
