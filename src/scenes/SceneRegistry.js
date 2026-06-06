const SCENE_LOADERS = [
  () => import('./Chapter1Scene.js').then(module => module.Chapter1Scene),
  () => import('./Chapter2Scene.js').then(module => module.Chapter2Scene),
  () => import('./Chapter3Scene.js').then(module => module.Chapter3Scene),
  () => import('./Chapter4Scene.js').then(module => module.Chapter4Scene),
  () => import('./Chapter56Scene.js').then(module => module.Chapter5Scene),
  () => import('./Chapter56Scene.js').then(module => module.Chapter6Scene),
  () => import('./Chapter7Scene.js').then(module => module.Chapter7Scene),
];

export function getSceneRegistryMetadata() {
  return SCENE_LOADERS.map((loader, index) => ({
    index,
    lazy: true,
    loader,
  }));
}

export async function loadChapterSceneClass(index) {
  const loader = SCENE_LOADERS[index];
  if (!loader) throw new RangeError(`Unknown chapter scene index: ${index}`);
  return loader();
}
