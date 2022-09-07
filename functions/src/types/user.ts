export type User = {
  username: string;
  userRole: string;
  userId: string;
};

export const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.username === "string" &&
    typeof record.userRole === "string" &&
    typeof record.userId === "string"
  );
};
