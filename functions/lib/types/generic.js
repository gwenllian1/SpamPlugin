"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTypeGuard = void 0;
exports.listTypeGuard = (l, typeGuard) => {
    if (!l || typeof l !== "object" || !Array.isArray(l))
        return false;
    return l.every(typeGuard);
};
//# sourceMappingURL=generic.js.map