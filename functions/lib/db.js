"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastMessage = exports.getAllBots = exports.getBotForTeam = exports.getPlayersTeam = exports.scheduleFirebaseUpdate = exports.updateValInDb = exports.setValInDb = exports.getValFromDb = void 0;
const admin = require("firebase-admin");
const db = admin.database();
exports.getValFromDb = async (path) => (await db.ref(path).get()).val();
exports.setValInDb = async (path, val) => await db.ref(path).set(val);
exports.updateValInDb = async (path, val) => await db.ref(path).update(val);
/**
 * Call this function to schedule an update to a firebase path in the future.  Note that all scheduled updates
 * associated with a specific meetingId will be cancelled (removed) when that meeting changes to a new section; if you
 * want a scheduled change to survive beyond the lifetime of the current section, use a different meetingId such as
 * "global".
 *
 * @param meetingId The meetingId with which to associate this scheduled update.  The meetingId does not actually have
 * to exist anywhere else in the system, and is only used for cleaning up the scheduled job.
 * @param timestamp The timestamp (ms since epoch) when the path should be updated.
 * @param path The Firebase path to update.
 * @param value The value to write to the nominated path at the nominated time.
 */
exports.scheduleFirebaseUpdate = async (meetingId, timestamp, path, value) => {
    const job = { timestamp, meetingId, path, value };
    await db.ref(`zoomSenseSchedule/meeting/${meetingId}/job`).push(job);
};
/**
 * Returns a team id from a player id
 * @param msgSenderId the Id of the player who's team we want to find
 * @param meetingId the meeting id
 * @returns the team's id
 */
exports.getPlayersTeam = async (msgSenderId, meetingId) => {
    return "Team1";
};
/**
 * Returns a zoom bot id associated with a particular team
 * @param meetingId The meeting id
 * @param teamId the team id
 * @returns the bot id
 */
exports.getBotForTeam = async (meetingId, teamId) => {
    return "ZoomSensor_1";
};
exports.getAllBots = async (meetingId) => {
    var _a;
    const activeSpeakers = await exports.getValFromDb(`/data/chats/${meetingId}`);
    if (!activeSpeakers || typeof activeSpeakers !== "object")
        return [];
    return Object.entries((_a = activeSpeakers) !== null && _a !== void 0 ? _a : {})
        .filter(([, { isInBO }]) => isInBO)
        .map(([zoomSensor]) => zoomSensor);
};
// Request that sensor with ID `sensorId` broadcasts the given message
// (i.e. sends it to everyone in the room)
exports.broadcastMessage = async (meetingId, sensorId, content) => {
    await db.ref(`data/chats/${meetingId}/${sensorId}/message`).push({
        msg: content,
        receiver: 0,
    });
};
//# sourceMappingURL=db.js.map