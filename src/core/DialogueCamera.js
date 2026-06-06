export const DIALOGUE_CAMERA_DEFAULTS = Object.freeze({
  distance: 2.55,
  sideOffset: 2.05,
  height: 1.85,
  lookAtHeight: 1.18,
  fov: 50,
});

function toPoint3(value, fallback = { x: 0, y: 0, z: 0 }) {
  if (!value) return fallback;
  return {
    x: Number.isFinite(Number(value.x)) ? Number(value.x) : fallback.x,
    y: Number.isFinite(Number(value.y)) ? Number(value.y) : fallback.y,
    z: Number.isFinite(Number(value.z)) ? Number(value.z) : fallback.z,
  };
}

function normalizeXZ(dx, dz) {
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 0.000001) return { x: 0, z: 1 };
  return { x: dx / length, z: dz / length };
}

export function getFacingYaw(fromPosition, toPosition) {
  const from = toPoint3(fromPosition);
  const to = toPoint3(toPosition);
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function computeDialogueFacing(playerPosition, npcPosition) {
  return {
    playerYaw: getFacingYaw(playerPosition, npcPosition),
    npcYaw: getFacingYaw(npcPosition, playerPosition),
  };
}

export function computeDialogueCameraTarget(playerPosition, npcPosition, options = {}) {
  const config = { ...DIALOGUE_CAMERA_DEFAULTS, ...options };
  const player = toPoint3(playerPosition);
  const npc = toPoint3(npcPosition);
  const forward = normalizeXZ(npc.x - player.x, npc.z - player.z);
  const side = { x: forward.z, z: -forward.x };
  const midpoint = {
    x: (player.x + npc.x) / 2,
    y: (player.y + npc.y) / 2,
    z: (player.z + npc.z) / 2,
  };

  return {
    position: {
      x: midpoint.x - forward.x * config.distance + side.x * config.sideOffset,
      y: midpoint.y + config.height,
      z: midpoint.z - forward.z * config.distance + side.z * config.sideOffset,
    },
    lookAt: {
      x: midpoint.x,
      y: midpoint.y + config.lookAtHeight,
      z: midpoint.z,
    },
    fov: config.fov,
    distance: config.distance,
    obstructed: false,
  };
}
