"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spamAnswers = void 0;
const functions = require("firebase-functions");
const answerFlow_1 = require("./answerFlow");
const db_1 = require("./db");
exports.spamAnswers = functions.database
    .ref("/data/chats/{meetingId}/{sensor}/{chatId}")
    .onCreate(async (value, context) => {
    const { meetingId, chatId } = context.params;
    if (!db_1.pluginEnabled(meetingId))
        return;
    // ensure not a control message
    if (chatId === "message")
        return;
    // get the message content
    const { msg: messageContent, msgSender, msgSenderName, timestamp, } = value.val();
    // if anything is missing from the message exit the function
    if (!messageContent || !msgSender || !msgSenderName || !timestamp)
        return;
    // if answer correct handle answer flow
    if (await db_1.answerCorrect(meetingId, messageContent)) {
        answerFlow_1.handleCorrectAnswer(meetingId, messageContent, timestamp, msgSender, msgSenderName);
    }
});
//# sourceMappingURL=spamAnswers.js.map