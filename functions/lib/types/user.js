"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUser = void 0;
exports.isUser = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return (typeof record.username === "string" &&
        typeof record.userRole === "string" &&
        typeof record.userId === "string");
};
//# sourceMappingURL=user.js.map