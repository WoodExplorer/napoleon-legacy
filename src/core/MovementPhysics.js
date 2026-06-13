export const DEFAULT_PLAYER_RADIUS = 0.38;
export const STICK_DEADZONE = 0.18;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const TWO_PI = Math.PI * 2;

// Smallest signed angle (radians) to turn `from` into `to`, in (-PI, PI].
export function shortestAngleDelta(from, to) {
  let delta = (to - from) % TWO_PI;
  if (delta > Math.PI) delta -= TWO_PI;
  if (delta < -Math.PI) delta += TWO_PI;
  return delta;
}

// Rotate `from` toward `to` by at most `maxStep` radians (shortest path).
export function rotateToward(from, to, maxStep) {
  const delta = shortestAngleDelta(from, to);
  if (Math.abs(delta) <= maxStep) return to;
  return from + Math.sign(delta) * maxStep;
}

/**
 * Camera-relative stick movement (mobile twin-stick feel).
 *
 * The left stick points where the player wants to go *on screen*: pushing up
 * walks away from the camera, left walks screen-left, etc. The character turns
 * to face its travel heading. Because the camera's world yaw is derived as
 * (playerYaw + camYaw), auto-facing the player would drag the camera with it —
 * so we emit `camYawDelta` (the negative of the facing change) for the caller to
 * fold into camYaw, keeping the camera fixed in world space while the body turns.
 *
 * Stick convention matches MobileJoystick: +x = right, +y = down (toward viewer).
 *
 * @returns {{moving:boolean, magnitude:number, dx:number, dz:number,
 *            playerYaw:number, camYawDelta:number, heading:number}}
 */
export function computeCameraRelativeMovement(stick, options = {}) {
  const worldYaw = options.worldYaw ?? 0;
  const playerYaw = options.playerYaw ?? 0;
  const speed = options.speed ?? 0;
  const delta = options.delta ?? 0;
  const turnRate = options.turnRate ?? 12;
  const deadzone = options.deadzone ?? STICK_DEADZONE;

  const sx = stick?.x ?? 0;
  const sy = stick?.y ?? 0;
  const rawMag = Math.sqrt(sx * sx + sy * sy);
  if (rawMag < deadzone) {
    return {
      moving: false,
      magnitude: 0,
      dx: 0,
      dz: 0,
      playerYaw,
      camYawDelta: 0,
      heading: playerYaw,
    };
  }

  // Rescale past the deadzone so motion ramps from 0 at the edge of the
  // deadzone to 1 at full deflection, then clamp.
  const magnitude = Math.min(1, (rawMag - deadzone) / (1 - deadzone));

  // Screen intent → world heading. Forward (stick up, sy<0) is the camera's
  // view direction (sin w, cos w); screen-right is the camera right vector
  // (forward × up) = (-cos w, sin w). Combine them into a world move vector,
  // then take its heading: dir = (sin h, cos h) matches the engine convention
  // (dx = sin yaw, dz = cos yaw).
  const forward = -sy;   // up on the stick = forward
  const right = sx;      // right on the stick = strafe right
  const moveX = forward * Math.sin(worldYaw) - right * Math.cos(worldYaw);
  const moveZ = forward * Math.cos(worldYaw) + right * Math.sin(worldYaw);
  const heading = Math.atan2(moveX, moveZ);

  const nextYaw = rotateToward(playerYaw, heading, turnRate * delta);
  const camYawDelta = -shortestAngleDelta(playerYaw, nextYaw);

  const step = speed * delta * magnitude;
  return {
    moving: step > 0,
    magnitude,
    dx: Math.sin(nextYaw) * step,
    dz: Math.cos(nextYaw) * step,
    playerYaw: nextYaw,
    camYawDelta,
    heading,
  };
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
