export const CAMERA_RIG_DEFAULTS = Object.freeze({
  minDistance: 2.35,
  maxDistance: 7.2,
  lookAtHeight: 1.25,
  cameraHeight: 2.5,
  collisionPadding: 0.42,
  followResponsiveness: 10,
  fovResponsiveness: 6,
  baseFov: 65,
  movingFovBoost: 2.8,
  blockedFovPenalty: -1.2,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeConfig(config = {}) {
  return { ...CAMERA_RIG_DEFAULTS, ...config };
}

function cloneVec3(vec) {
  return { x: vec.x, y: vec.y, z: vec.z };
}

export function clampCameraDistance(distance, config = {}) {
  const rig = normalizeConfig(config);
  const value = Number(distance);
  if (!Number.isFinite(value)) return rig.minDistance;
  return clamp(value, rig.minDistance, rig.maxDistance);
}

function getLineCircleHitT(start, end, obstacle, padding) {
  const radius = (obstacle.radius ?? 0) + padding;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const fx = start.x - obstacle.x;
  const fz = start.z - obstacle.z;
  const a = dx * dx + dz * dz;
  if (a <= 0.000001) return null;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const t1 = (-b - root) / (2 * a);
  const t2 = (-b + root) / (2 * a);
  if (t1 >= 0 && t1 <= 1) return t1;
  if (t2 >= 0 && t2 <= 1) return t2;
  return null;
}

function getLineBoxHitT(start, end, obstacle, padding) {
  const halfW = obstacle.width / 2 + padding;
  const halfD = obstacle.depth / 2 + padding;
  const minX = obstacle.x - halfW;
  const maxX = obstacle.x + halfW;
  const minZ = obstacle.z - halfD;
  const maxZ = obstacle.z + halfD;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  let enter = 0;
  let exit = 1;

  const updateAxis = (startValue, delta, min, max) => {
    if (Math.abs(delta) < 0.000001) {
      return startValue >= min && startValue <= max;
    }
    const t1 = (min - startValue) / delta;
    const t2 = (max - startValue) / delta;
    enter = Math.max(enter, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
    return enter <= exit;
  };

  if (!updateAxis(start.x, dx, minX, maxX)) return null;
  if (!updateAxis(start.z, dz, minZ, maxZ)) return null;
  return enter >= 0 && enter <= 1 ? enter : null;
}

export function resolveCameraDistance(start, desired, distance, obstacles = [], config = {}) {
  const rig = normalizeConfig(config);
  let nearestT = 1;
  for (const obstacle of obstacles) {
    const hitT = obstacle.type === 'circle'
      ? getLineCircleHitT(start, desired, obstacle, rig.collisionPadding)
      : getLineBoxHitT(start, desired, obstacle, rig.collisionPadding);
    if (hitT !== null) nearestT = Math.min(nearestT, hitT);
  }

  if (nearestT >= 1) return clampCameraDistance(distance, rig);
  return clampCameraDistance(distance * nearestT - rig.collisionPadding, rig);
}

export function computeCameraRigTarget(options, config = {}) {
  const rig = normalizeConfig(config);
  const player = options.playerPosition;
  const distance = clampCameraDistance(options.distance, rig);
  const pitch = clamp(options.pitch ?? 0, -0.82, 0.24);
  const yaw = (options.playerRotationY ?? 0) + (options.yawOffset ?? 0);
  const lookAt = {
    x: player.x,
    y: player.y + rig.lookAtHeight,
    z: player.z,
  };

  const resolvePosition = resolvedDistance => {
    const horizontal = resolvedDistance * Math.cos(pitch);
    return {
      x: player.x - Math.sin(yaw) * horizontal,
      y: player.y + rig.cameraHeight + resolvedDistance * Math.sin(-pitch),
      z: player.z - Math.cos(yaw) * horizontal,
    };
  };

  const desiredPosition = resolvePosition(distance);
  const resolvedDistance = resolveCameraDistance(
    { x: lookAt.x, z: lookAt.z },
    { x: desiredPosition.x, z: desiredPosition.z },
    distance,
    options.obstacles,
    rig
  );

  return {
    position: resolvePosition(resolvedDistance),
    lookAt,
    fov: rig.baseFov
      + (options.moving ? rig.movingFovBoost : 0)
      + (options.blocked ? rig.blockedFovPenalty : 0),
    distance: resolvedDistance,
    obstructed: resolvedDistance < distance,
  };
}

export function getSmoothingFactor(deltaSeconds, responsiveness) {
  const delta = Math.max(0, Number(deltaSeconds) || 0);
  return 1 - Math.exp(-Math.max(0, responsiveness) * delta);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function lerpVec3(start, end, amount) {
  return {
    x: lerp(start.x, end.x, amount),
    y: lerp(start.y, end.y, amount),
    z: lerp(start.z, end.z, amount),
  };
}

export function smoothCameraRigPose(current, target, deltaSeconds, config = {}) {
  if (!current) {
    return {
      position: cloneVec3(target.position),
      lookAt: cloneVec3(target.lookAt),
      fov: target.fov,
      distance: target.distance,
      obstructed: target.obstructed,
    };
  }

  const rig = normalizeConfig(config);
  const followFactor = getSmoothingFactor(deltaSeconds, rig.followResponsiveness);
  const fovFactor = getSmoothingFactor(deltaSeconds, rig.fovResponsiveness);
  return {
    position: lerpVec3(current.position, target.position, followFactor),
    lookAt: lerpVec3(current.lookAt, target.lookAt, followFactor),
    fov: lerp(current.fov, target.fov, fovFactor),
    distance: target.distance,
    obstructed: target.obstructed,
  };
}
