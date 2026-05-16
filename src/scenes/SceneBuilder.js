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

  static createGround(color = 0x4a7c3f, size = 40) {
    const geo = new THREE.PlaneGeometry(size, size, 20, 20);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
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
