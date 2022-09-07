"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTeam = exports.isTeams = void 0;
const generic_1 = require("./generic");
const user_1 = require("./user");
exports.isTeams = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return generic_1.listTypeGuard(Object.values(record), exports.isTeam);
};
exports.isTeam = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return (typeof record.isInBO === "boolean" &&
        typeof record.sensorId === "string" &&
        typeof record.teamName === "string" &&
        generic_1.listTypeGuard(record.members, user_1.isUser));
};
//# sourceMappingURL=team.js.map