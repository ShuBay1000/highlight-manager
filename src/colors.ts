export function hashString(value: string): number {
  let hash = 2166136261 >>> 0;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash >>> 0;
}

export function colorForString(value: string): { backgroundColor: string; borderColor: string } {
  const hue = hashString(value) % 360;

  return {
    backgroundColor: `hsla(${hue}, 90%, 60%, 0.28)`,
    borderColor: `hsla(${hue}, 90%, 42%, 0.75)`
  };
}
