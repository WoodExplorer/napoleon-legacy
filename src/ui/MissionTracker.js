const FLAG_SUFFIX_BY_DIALOGUE = {
  general: 'gen',
};

export function getObjectiveFlag(chapterIndex, npc) {
  if (npc.objectiveFlag) return npc.objectiveFlag;
  const suffix = FLAG_SUFFIX_BY_DIALOGUE[npc.dialogueId] || npc.dialogueId;
  return `ch${chapterIndex + 1}_talked_${suffix}`;
}

export function getNpcDistance(player, npc) {
  if (!player?.position || !npc?.mesh?.position) return null;
  const dx = npc.mesh.position.x - player.position.x;
  const dz = npc.mesh.position.z - player.position.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function formatDistance(distance) {
  if (distance == null || !Number.isFinite(distance)) return '--';
  return `${Math.max(0, Math.round(distance))}m`;
}

export function buildMissionState(chapterScene, gameState, translate = key => key, player = null, options = {}) {
  const allowedIds = Array.isArray(options.activeDialogueIds) ? new Set(options.activeDialogueIds) : null;
  const npcs = (chapterScene?.npcs || []).filter(npc => !allowedIds || allowedIds.has(npc.dialogueId));
  const objectives = npcs.map(npc => {
    const flag = getObjectiveFlag(chapterScene.index, npc);
    const done = Boolean(gameState?.getFlag?.(flag));
    const name = npc.nameKey ? translate(npc.nameKey) : npc.name;
    const distance = getNpcDistance(player, npc);
    return {
      id: npc.dialogueId,
      flag,
      name,
      done,
      distance,
      distanceLabel: formatDistance(distance),
      position: npc.mesh?.position
        ? { x: npc.mesh.position.x, z: npc.mesh.position.z }
        : null,
    };
  });

  const completed = objectives.filter(objective => objective.done).length;
  const total = objectives.length;
  return {
    completed,
    total,
    progress: total > 0 ? completed / total : 1,
    objectives,
  };
}
