const FULL_TURN = Math.PI * 2;
const HALF_TURN = Math.PI;
const DEFAULT_MAX_OFFSET = 118;

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

export function normalizeAngleRadians(angle) {
  if (!isFiniteNumber(angle)) return 0;
  return ((((Number(angle) + Math.PI) % FULL_TURN) + FULL_TURN) % FULL_TURN) - Math.PI;
}

export function getCameraHeading(cameraPose) {
  if (!cameraPose?.position || !cameraPose?.lookAt) return 0;
  const dx = cameraPose.lookAt.x - cameraPose.position.x;
  const dz = cameraPose.lookAt.z - cameraPose.position.z;
  if (Math.abs(dx) < 0.000001 && Math.abs(dz) < 0.000001) return 0;
  return Math.atan2(dx, dz);
}

export function getObjectiveHeading(playerPosition, objectivePosition) {
  if (!playerPosition || !objectivePosition) return 0;
  const dx = objectivePosition.x - playerPosition.x;
  const dz = objectivePosition.z - playerPosition.z;
  if (Math.abs(dx) < 0.000001 && Math.abs(dz) < 0.000001) return 0;
  return Math.atan2(dx, dz);
}

export function classifyCompassSide(relativeAngle) {
  const abs = Math.abs(normalizeAngleRadians(relativeAngle));
  if (abs < Math.PI / 8) return 'ahead';
  if (abs > Math.PI * 0.76) return 'behind';
  return relativeAngle < 0 ? 'left' : 'right';
}

export function getActiveCompassObjective(missionState) {
  const objectives = missionState?.objectives || [];
  return objectives
    .filter(objective => !objective.done && objective.position)
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0] || null;
}

export function buildObjectiveCompassState(missionState, playerPosition, cameraPose, options = {}) {
  const objective = getActiveCompassObjective(missionState);
  if (!objective || !playerPosition) {
    return { visible: false };
  }

  const maxOffset = options.maxOffset ?? DEFAULT_MAX_OFFSET;
  const cameraHeading = getCameraHeading(cameraPose);
  const objectiveHeading = getObjectiveHeading(playerPosition, objective.position);
  const relativeAngle = normalizeAngleRadians(objectiveHeading - cameraHeading);
  const clamped = Math.max(-HALF_TURN, Math.min(HALF_TURN, relativeAngle));

  return {
    visible: true,
    objectiveId: objective.id,
    name: objective.name,
    distanceLabel: objective.distanceLabel,
    relativeAngle,
    side: classifyCompassSide(relativeAngle),
    offsetPx: Math.round((clamped / HALF_TURN) * maxOffset),
    arrowRotationDeg: Math.round((relativeAngle * 180) / Math.PI),
  };
}
