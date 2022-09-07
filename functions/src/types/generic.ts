export const listTypeGuard = <T>(
  l: unknown,
  typeGuard: (val: unknown) => val is T
): l is T[] => {
  if (!l || typeof l !== "object" || !Array.isArray(l)) return false;
  return l.every(typeGuard);
};
