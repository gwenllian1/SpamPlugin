"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spamAnswers = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const db_1 = require("./db");
//const { snapshot } = require("firebase-functions");
//const admin = require("firebase-admin");
const db = admin.database();
exports.spamAnswers = functions.database
    .ref("/data/chats/{meetingId}/{sensor}/{chatId}")
    .onCreate(async (value, context) => {
    const { meetingId, chatId } = context.params;
    //Check if plugin is enabled
    const config = (await db
        .ref(`/config/${meetingId}/current/currentState/plugins/spammessages`)
        .get()).val();
    if (!config || !config.enabled)
        return;
    // ensure not a control message
    if (chatId === "message")
        return;
    //get the message content
    const { msg: messageContent, msgSender, msgSenderName, timestamp, } = value.val();
    //if anything is missing from the message exit the function
    if (!messageContent || !msgSender || !msgSenderName || !timestamp)
        return;
    // check if answer is correct
    var answers = (await db
        .ref(`/config/${meetingId}/current/currentState/plugins/spammessages/solutions`)
        .get()).val();
    const answerCorrect = answers.find((val) => val === messageContent.toLowerCase().trim()) !==
        undefined;
    if (answerCorrect) {
        const teamId = await db_1.getPlayersTeam(msgSender.toString(), meetingId);
        if (!teamId)
            return;
        // store answer in db
        const roundName = await db_1.getValFromDb(`/config/${meetingId}/current/currentState/plugins/spammessages/roundName`);
        await db_1.setValInDb(`data/spamAnswers/${meetingId}/${roundName}/answers`, {
            senderId: msgSender,
            senderName: msgSenderName,
            answer: messageContent,
            timestamp,
            teamId,
        });
        // update score for the team
        var questionWeight = (await db
            .ref(`/config/${meetingId}/current/currentState/plugins/spammessages/questionWeight`)
            .get()).val();
        await db_1.incrementTeamsScore(meetingId, teamId, questionWeight, timestamp);
        // send chat to this team to tell them they got the correct answer
        const teamBotId = await db_1.getBotForTeam(meetingId, teamId);
        if (!teamBotId)
            return;
        await db_1.broadcastMessage(meetingId, teamBotId, `Well done! ${messageContent} was the correct answer, we are moving on to the next round`);
        // send message to all other teams telling them the correct answer
        const botIds = await db_1.getAllBots(meetingId);
        botIds.forEach(async (id) => {
            // if is winning team's bot ignore
            if (id === teamBotId) {
                return;
            }
            await db_1.broadcastMessage(meetingId, id, `Unfortunately, Team ${teamId} guessed the correct answer (${messageContent}), better luck next time!`);
        });
        // move to next round
        let { currentSection } = (await db.ref(`/config/${meetingId}/current`).get()).val();
        if (typeof currentSection == "string") {
            currentSection = parseInt(currentSection);
        }
        await db_1.scheduleFirebaseUpdate(meetingId, timestamp, `config/${meetingId}/current/currentSection`, parseInt(currentSection) + 1);
    }
});
//# sourceMappingURL=spamAnswers.js.map