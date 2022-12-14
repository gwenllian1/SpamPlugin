"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTypeGuard = exports.isTeams = exports.isAnswers = exports.isAnswer = exports.isTeam = void 0;
const isUser = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return (typeof record.username === "string" &&
        typeof record.userRole === "string" &&
        typeof record.userId === "string");
};
exports.isTeam = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return (typeof record.isInBO === "boolean" &&
        typeof record.sensorId === "string" &&
        typeof record.teamName === "string" &&
        exports.listTypeGuard(record.members, isUser));
};
exports.isAnswer = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return (typeof record.answer === "string" &&
        typeof record.senderId === "number" &&
        typeof record.senderName === "string" &&
        typeof record.teamId === "string" &&
        typeof record.timestamp === "number");
};
exports.isAnswers = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return exports.listTypeGuard(Object.values(record), exports.isAnswer);
};
exports.isTeams = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return exports.listTypeGuard(Object.values(record), exports.isTeam);
};
exports.listTypeGuard = (l, typeGuard) => {
    if (!l || typeof l !== "object" || !Array.isArray(l))
        return false;
    return l.every(typeGuard);
};
//# sourceMappingURL=types.js.map