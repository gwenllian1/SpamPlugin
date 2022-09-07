"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveToNextRound = exports.broadcastMessage = exports.getAllBots = exports.getBotForTeam = exports.getPlayersTeam = exports.answerCorrect = exports.pluginEnabled = exports.pushValToDb = exports.updateValInDb = exports.setValInDb = exports.getValFromDb = void 0;
const team_1 = require("./types/team");
const admin = require("firebase-admin");
const db = admin.database();
exports.getValFromDb = async (path) => (await db.ref(path).get()).val();
exports.setValInDb = async (path, val) => await db.ref(path).set(val);
exports.updateValInDb = async (path, val) => await db.ref(path).update(val);
exports.pushValToDb = async (path, val) => await db.ref(path).push(val);
exports.pluginEnabled = async (meetingId) => {
    // get config
    const config = (await db
        .ref(`/config/${meetingId}/current/currentState/plugins/spammessages`)
        .get()).val();
    // check enabled
    return config && config.enabled;
};
exports.answerCorrect = async (meetingId, answer) => {
    // find allowable answers
    var answers = (await db
        .ref(`/config/${meetingId}/current/currentState/plugins/spammessages/solutions`)
        .get()).val();
    // check if submitted answer is correct
    return (answers.find((val) => val === answer.toLowerCase().trim()) !== undefined);
};
/**
 * Returns a team id from a player id
 * @param msgSenderId the Id of the player who's team we want to find
 * @param meetingId the meeting id
 * @returns the team's id
 */
exports.getPlayersTeam = async (msgSenderId, meetingId) => {
    const teams = await exports.getValFromDb(`data/plugins/teamPlugin/${meetingId}`);
    if (!team_1.isTeams(teams)) {
        return null;
    }
    const teamId = Object.entries(teams)
        .map(([teamId]) => {
        // find member in this team with the id wer'e looking fo
        const member = teams[teamId].members.find((member) => member.userId === msgSenderId);
        if (member) {
            return teamId;
        }
        return undefined;
    })
        // find only the teamId
        .find((teamId) => teamId !== undefined);
    if (!teamId) {
        // teamId not found -> error
        return null;
    }
    return teamId;
};
/**
 * Returns a zoom bot id associated with a particular team
 * @param meetingId The meeting id
 * @param teamId the team id
 * @returns the bot id
 */
exports.getBotForTeam = async (meetingId, teamId) => {
    const team = await exports.getValFromDb(`data/plugins/teamPlugin/${meetingId}/${teamId}`);
    if (!team_1.isTeam(team)) {
        return null;
    }
    return team.sensorId;
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
exports.moveToNextRound = async (meetingId, timestamp) => {
    // find current section
    let { currentSection } = (await db.ref(`/config/${meetingId}/current`).get()).val();
    if (typeof currentSection == "string") {
        currentSection = parseInt(currentSection);
    }
    // update db to be in next section
    await db.ref(`zoomSenseSchedule/meeting/${meetingId}/job`).push({
        timestamp,
        meetingId,
        path: `config/${meetingId}/current/currentSection`,
        value: parseInt(currentSection) + 1,
    });
};
//# sourceMappingURL=db.js.map