import { listTypeGuard } from "./generic";
import { isUser, User } from "./user";

export type Team = {
  isInBO: boolean;
  sensorId: string;
  teamName: string;
  members: User[];
};

export type Teams = {
  [teamId: string]: Team;
};

export const isTeams = (value: unknown): value is Teams => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return listTypeGuard(Object.values(record), isTeam);
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
