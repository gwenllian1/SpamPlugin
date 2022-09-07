"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correctAnswerSingle = exports.correctAnswerMultiple = exports.handleCorrectAnswer = exports.saveAnswerAndIncrementScore = exports.answerAlreadySubmitted = exports.updateTeamScore = exports.incrementTeamsScore = void 0;
const db_1 = require("./db");
const answer_1 = require("./types/answer");
exports.incrementTeamsScore = async (meetingId, teamId, scoreIncrement, timestamp) => {
    await db_1.pushValToDb(`data/plugins/leaderboard/${meetingId}/scoreEvents`, {
        amount: scoreIncrement,
        teamId,
        timestamp,
    });
};
exports.updateTeamScore = async (meetingId, timestamp, teamId) => {
    const questionWeight = await db_1.getValFromDb(`/config/${meetingId}/current/currentState/plugins/spammessages/questionWeight`);
    await exports.incrementTeamsScore(meetingId, teamId, typeof questionWeight === "number" ? questionWeight : 1, timestamp);
};
// checks if a answer has already been submitted
exports.answerAlreadySubmitted = async (previousAnswers, submitedAnswer) => {
    return (
    // check if each of the previous answer matches submitted
    Object.entries(previousAnswers)
        .map(([_, answer]) => {
        if (answer.answer.toLowerCase().trim() ===
            submitedAnswer.toLocaleLowerCase().trim()) {
            return true;
        }
        return false;
    })
        // if no answer matches answer has never been submitted
        .find((answered) => answered) !== undefined);
};
/**
 * Saves the answer in the db
 * Increments the team's score
 * Send the team a message
 */
exports.saveAnswerAndIncrementScore = async (meetingId, teamId, teamBotId, roundName, messageContent, timestamp, msgSender, msgSenderName, teamMessage) => {
    // store answer in db
    await db_1.pushValToDb(`data/plugins/spamAnswers/${meetingId}/${roundName}/answers/${teamId}`, {
        senderId: msgSender,
        senderName: msgSenderName,
        answer: messageContent,
        timestamp,
        teamId,
    });
    await exports.updateTeamScore(meetingId, timestamp, msgSender);
    await db_1.broadcastMessage(meetingId, teamBotId, teamMessage);
};
/**
 * Handles a correct answer submission from a team
 * @param meetingId the zoomsense meeting id
 * @param messageContent the submitted answer
 * @param timestamp the current timestamp
 * @param msgSender the id of the sender of the message
 * @param msgSenderName the name of the sender of the message
 */
exports.handleCorrectAnswer = async (meetingId, messageContent, timestamp, msgSender, msgSenderName) => {
    // get team info
    const teamId = await db_1.getPlayersTeam(msgSender.toString(), meetingId);
    if (!teamId)
        return;
    const teamBotId = await db_1.getBotForTeam(meetingId, teamId);
    if (!teamBotId)
        return;
    // get round info
    const roundName = await db_1.getValFromDb(`/config/${meetingId}/current/currentState/plugins/spammessages/roundName`);
    const roundType = await db_1.getValFromDb(`/config/${meetingId}/current/currentState/plugins/spammessages/roundType`);
    if (typeof roundType !== "string") {
        return;
    }
    // handle answer based on round type
    switch (roundType) {
        case "single_answer":
            await exports.correctAnswerSingle(meetingId, teamId, teamBotId, roundName, messageContent, timestamp, msgSender, msgSenderName);
        case "multiple_answer":
            await exports.correctAnswerMultiple(meetingId, teamId, roundName, messageContent, timestamp, msgSender, msgSenderName, teamBotId);
    }
};
/**
 * Handles a correct answer submission for the multiple answer type
 * @param meetingId the zoomsense meeting id
 * @param teamId the id of the team which submitted the answer
 * @param teamBotId the id of the bot representing this team
 * @param roundName the name of the current question
 * @param messageContent the submitted answer
 * @param timestamp the current timestamp
 * @param msgSender the id of the sender of the message
 * @param msgSenderName the name of the sender of the message
 */
exports.correctAnswerMultiple = async (meetingId, teamId, roundName, messageContent, timestamp, msgSender, msgSenderName, teamBotId) => {
    var previousAnswers = await db_1.getValFromDb(`data/plugins/spamAnswers/${meetingId}/${roundName}/answers/${teamId}`);
    // if team has previously submitted this answer -> let team know
    if (answer_1.isAnswers(previousAnswers) &&
        (await exports.answerAlreadySubmitted(previousAnswers, messageContent))) {
        await db_1.broadcastMessage(meetingId, teamBotId, `${messageContent} has already been submitted, please try a different answer`);
        return;
    }
    // team hasnt submitted this answer yet -> increment score
    await exports.saveAnswerAndIncrementScore(meetingId, teamId, teamBotId, roundName, messageContent, timestamp, msgSender, msgSenderName, `Well done! ${messageContent} was a correct answer`);
};
/**
 * Handles a correct answer submission for the single answer type
 * @param meetingId the zoomsense meeting id
 * @param teamId the id of the team which submitted the answer
 * @param teamBotId the id of the bot representing this team
 * @param roundName the name of the current question
 * @param messageContent the submitted answer
 * @param timestamp the current timestamp
 * @param msgSender the id of the sender of the message
 * @param msgSenderName the name of the sender of the message
 */
exports.correctAnswerSingle = async (meetingId, teamId, teamBotId, roundName, messageContent, timestamp, msgSender, msgSenderName) => {
    // save answer, increment score and let team know
    await exports.saveAnswerAndIncrementScore(meetingId, teamId, teamBotId, roundName, messageContent, timestamp, msgSender, msgSenderName, `Well done! ${messageContent} was the correct answer, we are moving on to the next round`);
    // message all other teams  the correct answer
    const botIds = await db_1.getAllBots(meetingId);
    botIds.forEach(async (id) => {
        // if is winning team's bot ignore
        if (id === teamBotId) {
            return;
        }
        await db_1.broadcastMessage(meetingId, id, `Unfortunately, Team ${teamId} guessed the correct answer (${messageContent}), better luck next time!`);
    });
    // move to next round
    await db_1.moveToNextRound(meetingId, timestamp);
};
//# sourceMappingURL=answerFlow.js.map