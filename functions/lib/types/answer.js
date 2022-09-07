"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAnswers = exports.isAnswer = void 0;
const generic_1 = require("./generic");
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
    return generic_1.listTypeGuard(Object.values(record), exports.isAnswer);
};
//# sourceMappingURL=answer.js.map