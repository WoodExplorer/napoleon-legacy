export const DEFAULT_PLAYER_RADIUS = 0.38;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeBounds(bounds, radius) {
  if (!bounds) return null;
  return {
    minX: bounds.minX + radius,
    maxX: bounds.maxX - radius,
    minZ: bounds.minZ + radius,
    maxZ: bounds.maxZ - radius,
  };
}

export function clampToBounds(position, bounds, radius = DEFAULT_PLAYER_RADIUS) {
  const normalized = normalizeBounds(bounds, radius);
  if (!normalized) return { ...position, blocked: false };
  const x = clamp(position.x, normalized.minX, normalized.maxX);
  const z = clamp(position.z, normalized.minZ, normalized.maxZ);
  return { x, z, blocked: x !== position.x || z !== position.z };
}

export function resolveCircleCollision(position, circle, radius = DEFAULT_PLAYER_RADIUS) {
  const minDist = radius + (circle.radius ?? 0);
  const dx = position.x - circle.x;
  const dz = position.z - circle.z;
  const distSq = dx * dx + dz * dz;
  if (distSq >= minDist * minDist) return { ...position, blocked: false };

  if (distSq < 0.0001) {
    return { x: circle.x + minDist, z: circle.z, blocked: true };
  }

  const dist = Math.sqrt(distSq);
  const scale = minDist / dist;
  return {
    x: circle.x + dx * scale,
    z: circle.z + dz * scale,
    blocked: true,
  };
}

export function resolveBoxCollision(position, box, radius = DEFAULT_PLAYER_RADIUS) {
  const halfW = box.width / 2 + radius;
  const halfD = box.depth / 2 + radius;
  const dx = position.x - box.x;
  const dz = position.z - box.z;

  if (Math.abs(dx) >= halfW || Math.abs(dz) >= halfD) {
    return { ...position, blocked: false };
  }

  const pushX = halfW - Math.abs(dx);
  const pushZ = halfD - Math.abs(dz);
  if (pushX < pushZ) {
    return {
      x: box.x + Math.sign(dx || 1) * halfW,
      z: position.z,
      blocked: true,
    };
  }

  return {
    x: position.x,
    z: box.z + Math.sign(dz || 1) * halfD,
    blocked: true,
  };
}

export function resolvePlayerNavigation(position, options = {}) {
  const radius = options.radius ?? DEFAULT_PLAYER_RADIUS;
  let next = { x: position.x, z: position.z, blocked: false };

  const bounded = clampToBounds(next, options.bounds, radius);
  next = { x: bounded.x, z: bounded.z, blocked: next.blocked || bounded.blocked };

  for (const obstacle of options.obstacles || []) {
    const resolved = obstacle.type === 'circle'
      ? resolveCircleCollision(next, obstacle, radius)
      : resolveBoxCollision(next, obstacle, radius);
    next = { x: resolved.x, z: resolved.z, blocked: next.blocked || resolved.blocked };
  }

  const finalBounded = clampToBounds(next, options.bounds, radius);
  return {
    x: finalBounded.x,
    z: finalBounded.z,
    blocked: next.blocked || finalBounded.blocked,
  };
}
