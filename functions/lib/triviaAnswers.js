"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triviaAnswers = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const db_1 = require("./db");
//const { snapshot } = require("firebase-functions");
//const admin = require("firebase-admin");
const db = admin.database();
exports.triviaAnswers = functions.database
    .ref("/data/chats/{meetingId}/{sensor}/{chatId}")
    .onCreate(async (value, context) => {
    const { meetingId, chatId } = context.params;
    console.log("entered function");
    //Check if plugin is enabled
    const config = (await db
        .ref(`/config/${meetingId}/current/currentState/plugins/triviaanswers`)
        .get()).val();
    if (!config || !config.enabled)
        return;
    console.log("line28");
    // ensure not a control message
    if (chatId === "message")
        return;
    //get the message content
    const { msg: messageContent, msgSender, msgSenderName, timestamp, } = value.val();
    //if anything is missing from the message exit the function
    if (!messageContent || !msgSender || !msgSenderName || !timestamp)
        return;
    console.log("nothing missing");
    // check if answer is correct
    var answers = (await db
        .ref(`/config/${meetingId}/current/currentState/plugins/triviaanswers/solutions`)
        .get()).val();
    console.log(answers);
    const answerCorrect = answers.find((val) => val === messageContent.toLowerCase().trim()) !==
        undefined;
    console.log(answerCorrect);
    const teamId = await db_1.getPlayersTeam(msgSender.toString(), meetingId);
    if (!teamId)
        return;
    console.log(teamId);
    const teamBotId = await db_1.getBotForTeam(meetingId, teamId);
    console.log(teamBotId);
    if (!teamBotId)
        return;
    //if the answer is correct, get the team id and team bot id and call either correct answer single or correct
    //answer multiple.
    if (answerCorrect) {
        const roundName = await db_1.getValFromDb(`/config/${meetingId}/current/currentState/plugins/triviaanswers/roundName`);
        const roundType = await db_1.getValFromDb(`/config/${meetingId}/current/currentState/plugins/triviaanswers/roundType`);
        console.log(roundType);
        if (typeof roundType === "string" &&
            roundType.toLowerCase().trim() === "single_answer") {
            // store answer in db
            await db_1.setValInDb(`data/plugins/triviaAnswers/${meetingId}/${roundName}/answers/${teamId}`, {
                senderId: msgSender,
                senderName: msgSenderName,
                answer: messageContent,
                timestamp,
                teamId,
            });
            await db_1.updateTeamScore(meetingId, roundName, msgSender);
            await db_1.correctAnswerSingle(meetingId, teamId, messageContent, timestamp);
        }
        else if (typeof roundType === "string" &&
            roundType.toLowerCase().trim() === "multiple_answer") {
            await db_1.correctAnswerMultiple(meetingId, teamId, roundName, messageContent, timestamp, msgSender, msgSenderName);
        }
        else if (typeof roundType === "string" &&
            roundType.toLowerCase().trim() === "trivia_round") {
            await db_1.correctAnswerTrivia(meetingId, teamId, messageContent);
            await db_1.updateTeamScore(meetingId, roundName, msgSender);
        }
        //TO DO: SOME KIND OF ERROR HANDLING FOR IF THE ROUND TYPE IS WRONG
    }
    else {
        await db_1.checkAnswerSimilarity(answers, messageContent.toLowerCase().trim(), meetingId, teamBotId);
    }
});
//# sourceMappingURL=triviaAnswers.js.map