import { listTypeGuard } from "./generic";

export type Answer = {
  answer: string;
  senderId: number;
  senderName: string;
  teamId: string;
  timestamp: number;
};

export type Answers = {
  [answerId: string]: Answer;
};

export const isAnswer = (value: unknown): value is Answer => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.answer === "string" &&
    typeof record.senderId === "number" &&
    typeof record.senderName === "string" &&
    typeof record.teamId === "string" &&
    typeof record.timestamp === "number"
  );
};

export const isAnswers = (value: unknown): value is Answers => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return listTypeGuard(Object.values(record), isAnswer);
};
