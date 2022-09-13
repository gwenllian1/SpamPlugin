"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correctAnswerTrivia = exports.correctAnswerSingle = exports.correctAnswerMultiple = exports.checkAnswerSimilarity = exports.updateTeamScore = exports.nextRound = exports.broadcastMessage = exports.getAllBots = exports.incrementTeamsScore = exports.getBotForTeam = exports.getPlayersTeam = exports.scheduleFirebaseUpdate = exports.pushValToDb = exports.updateValInDb = exports.setValInDb = exports.getValFromDb = void 0;
const types_1 = require("./types");
const admin = require("firebase-admin");
const db = admin.database();
exports.getValFromDb = async (path) => (await db.ref(path).get()).val();
exports.setValInDb = async (path, val) => await db.ref(path).set(val);
exports.updateValInDb = async (path, val) => await db.ref(path).update(val);
exports.pushValToDb = async (path, val) => await db.ref(path).push(val);
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
    const teams = await exports.getValFromDb(`data/plugins/teamPlugin/${meetingId}`);
    if (!types_1.isTeams(teams)) {
        return null;
    }
    const teamId = Object.entries(teams)
        .map(([teamId]) => {
        console.log(teams[teamId]);
        // find member in this team with the id wer'e looking fo
        const member = teams[teamId].members.find((member) => member.userId === msgSenderId);
        console.log(member);
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
    if (!types_1.isTeam(team)) {
        return null;
    }
    return team.sensorId;
};
/**
 * Increments a team's score
 * @param meetingId the id of the meeting
 * @param teamId the id of the team
 * @param scoreIncrement the amount to increment the score by
 * @param timestamp the timestamp
 */
exports.incrementTeamsScore = async (meetingId, teamId, scoreIncrement, timestamp) => {
    await db.ref(`data/plugins/leaderboard/${meetingId}/scoreEvents`).push({
        amount: scoreIncrement,
        teamId,
        timestamp,
    });
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
exports.nextRound = async (meetingId, timestamp) => {
    // move to next round
    let { currentSection } = (await db.ref(`/config/${meetingId}/current`).get()).val();
    if (typeof currentSection == "string") {
        currentSection = parseInt(currentSection);
    }
    await exports.scheduleFirebaseUpdate(meetingId, timestamp, `config/${meetingId}/current/currentSection`, parseInt(currentSection) + 1);
};
exports.updateTeamScore = async (meetingId, timestamp, teamId) => {
    // update score for the team
    var questionWeight = (await db
        .ref(`/config/${meetingId}/current/currentState/plugins/triviaanswers/questionWeight`)
        .get()).val();
    await exports.incrementTeamsScore(meetingId, teamId, questionWeight, timestamp);
};
exports.checkAnswerSimilarity = async (correctAnswers, submittedAnswer, meetingId, teamBotId) => {
    correctAnswers.forEach(async function (answer) {
        let diff = 0;
        const longest = answer.length >= submittedAnswer.length ? answer : submittedAnswer;
        const shortest = answer.length >= submittedAnswer.length ? submittedAnswer : answer;
        for (let i = 0; i <= longest.length; i++) {
            if (longest.charAt(i) != shortest.charAt(i)) {
                diff += 1;
            }
        }
        if (diff < 2) {
            await exports.broadcastMessage(meetingId, teamBotId, `This answer was very close!`);
            return;
        }
    });
};
exports.correctAnswerMultiple = async (meetingId, teamId, roundName, messageContent, timestamp, msgSender, msgSenderName) => {
    const teamBotId = await exports.getBotForTeam(meetingId, teamId);
    if (!teamBotId)
        return;
    //checking if the answer has been submitted before
    var previousAnswers = (await db
        .ref(`data/plugins/triviaAnswers/${meetingId}/${roundName}/answers/${teamId}`)
        .get()).val();
    console.log("previous answers");
    console.log(previousAnswers);
    //the answer is in the db, check if the team submitted it
    if (previousAnswers) {
        const answered = Object.values(previousAnswers).find((val) => val === messageContent.toLowerCase().trim()) !== undefined;
        console.log("answered");
        console.log(answered);
        //if the team has not submitted the answer before, update the database otherwise inform them
        //that the answer is not valid.
        if (!answered) {
            await exports.pushValToDb(`data/plugins/triviaAnswers/${meetingId}/${roundName}/answers/${teamId}`, {
                senderId: msgSender,
                senderName: msgSenderName,
                answer: messageContent,
                timestamp,
                teamId,
            });
            await exports.broadcastMessage(meetingId, teamBotId, `Well done! ${messageContent} was a correct answer`);
            await exports.updateTeamScore(meetingId, roundName, msgSender);
        }
        else {
            await exports.broadcastMessage(meetingId, teamBotId, `${messageContent} has already been submitted, please try a different answer`);
        }
    }
    else {
        //if there are no previous answers in the database
        await exports.pushValToDb(`data/plugins/triviaAnswers/${meetingId}/${roundName}/answers/${teamId}`, {
            senderId: msgSender,
            senderName: msgSenderName,
            answer: messageContent,
            timestamp,
            teamId,
        });
        await exports.updateTeamScore(meetingId, roundName, msgSender);
        await exports.broadcastMessage(meetingId, teamBotId, `Well done! ${messageContent} was a correct answer`);
    }
};
exports.correctAnswerSingle = async (meetingId, teamId, messageContent, timestamp) => {
    // send chat to this team to tell them they got the correct answer
    const teamBotId = await exports.getBotForTeam(meetingId, teamId);
    if (!teamBotId)
        return;
    await exports.broadcastMessage(meetingId, teamBotId, `Well done! ${messageContent} was the correct answer, we are moving on to the next round`);
    // send message to all other teams telling them the correct answer
    const botIds = await exports.getAllBots(meetingId);
    botIds.forEach(async (id) => {
        // if is winning team's bot ignore
        if (id === teamBotId) {
            return;
        }
        await exports.broadcastMessage(meetingId, id, `Unfortunately, Team ${teamId} guessed the correct answer (${messageContent}), better luck next time!`);
    });
    await exports.nextRound(meetingId, timestamp);
};
exports.correctAnswerTrivia = async (meetingId, teamId, messageContent) => {
    // send chat to this team to tell them they got the correct answer
    const teamBotId = await exports.getBotForTeam(meetingId, teamId);
    if (!teamBotId)
        return;
    await exports.broadcastMessage(meetingId, teamBotId, `Well done! ${messageContent} was the correct answer.`);
};
//# sourceMappingURL=db.js.map