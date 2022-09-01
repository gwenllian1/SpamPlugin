export type User = {
  username: string;
  userRole: string;
  userId: string;
};
export type Team = {
  isInBO: boolean;
  sensorId: string;
  teamName: string;
  members: User[];
};

export type Teams = {
  [teamId: string]: Team;
};

const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.username === "string" &&
    typeof record.userRole === "string" &&
    typeof record.userId === "string"
  );
};

export const isTeam = (value: unknown): value is Team => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.isInBO === "boolean" &&
    typeof record.sensorId === "string" &&
    typeof record.teamName === "string" &&
    listTypeGuard(record.members, isUser)
  );
};

export const isTeams = (value: unknown): value is Teams => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return listTypeGuard(Object.values(record), isTeam);
};

export const listTypeGuard = <T>(
  l: unknown,
  typeGuard: (val: unknown) => val is T
): l is T[] => {
  if (!l || typeof l !== "object" || !Array.isArray(l)) return false;
  return l.every(typeGuard);
};
