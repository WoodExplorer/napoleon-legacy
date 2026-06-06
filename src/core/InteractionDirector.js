export const DEFAULT_INTERACTION_AWARENESS_DIST = 6.5;
export const DEFAULT_INTERACTION_READY_ASSIST_DIST = 0.4;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function getInteractionDistance(player, npc) {
  if (!player?.position || !npc?.mesh?.position) return Infinity;
  const dx = npc.mesh.position.x - player.position.x;
  const dz = npc.mesh.position.z - player.position.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function formatInteractionDistance(distance) {
  if (!Number.isFinite(distance)) return '--';
  return `${Math.max(0, Math.round(distance))}m`;
}

export function getNearestInteractionTarget(player, npcs = [], options = {}) {
  const awarenessDist = options.awarenessDist ?? DEFAULT_INTERACTION_AWARENESS_DIST;
  const readyAssistDist = Math.max(0, options.readyAssistDist ?? DEFAULT_INTERACTION_READY_ASSIST_DIST);
  return npcs
    .map(npc => {
      const interactDist = npc.interactDist ?? options.interactDist ?? 2.5;
      return {
        npc,
        distance: getInteractionDistance(player, npc),
        interactDist,
        readyDist: interactDist + readyAssistDist,
      };
    })
    .filter(candidate => candidate.distance <= awarenessDist)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

export function buildInteractionPromptState(player, npcs = [], translate = key => key, options = {}) {
  if (options.enabled === false) return { visible: false };

  const target = getNearestInteractionTarget(player, npcs, options);
  if (!target) return { visible: false };

  const awarenessDist = options.awarenessDist ?? DEFAULT_INTERACTION_AWARENESS_DIST;
  const canInteract = target.distance <= target.readyDist;
  const name = target.npc.nameKey ? translate(target.npc.nameKey) : target.npc.name;
  const distanceLabel = formatInteractionDistance(target.distance);
  const range = Math.max(0.001, awarenessDist - target.readyDist);
  const progress = canInteract
    ? 1
    : clamp01(1 - ((target.distance - target.readyDist) / range));

  return {
    visible: true,
    canInteract,
    npc: target.npc,
    name,
    distance: target.distance,
    distanceLabel,
    interactDist: target.interactDist,
    readyDist: target.readyDist,
    progress,
  };
}
