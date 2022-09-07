import * as functions from "firebase-functions";
import { handleCorrectAnswer } from "./answerFlow";
import { answerCorrect, pluginEnabled } from "./db";

export const spamAnswers = functions.database
  .ref("/data/chats/{meetingId}/{sensor}/{chatId}")
  .onCreate(async (value, context) => {
    const { meetingId, chatId } = context.params;

    if (!pluginEnabled(meetingId)) return;

    // ensure not a control message
    if (chatId === "message") return;

    // get the message content
    const {
      msg: messageContent,
      msgSender,
      msgSenderName,
      timestamp,
    } = value.val();

    // if anything is missing from the message exit the function
    if (!messageContent || !msgSender || !msgSenderName || !timestamp) return;

    // if answer correct handle answer flow
    if (await answerCorrect(meetingId, messageContent)) {
      handleCorrectAnswer(
        meetingId,
        messageContent,
        timestamp,
        msgSender,
        msgSenderName
      );
    }
  });
