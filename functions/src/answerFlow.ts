import {
  broadcastMessage,
  getAllBots,
  getBotForTeam,
  getPlayersTeam,
  getValFromDb,
  moveToNextRound,
  pushValToDb,
} from "./db";
import { Answers, isAnswers } from "./types/answer";

export const incrementTeamsScore = async (
  meetingId: string,
  teamId: string,
  scoreIncrement: number,
  timestamp: number
): Promise<void> => {
  await pushValToDb(`data/plugins/leaderboard/${meetingId}/scoreEvents`, {
    amount: scoreIncrement,
    teamId,
    timestamp,
  });
};

export const updateTeamScore = async (
  meetingId: string,
  timestamp: any,
  teamId: string
) => {
  const questionWeight = await getValFromDb(
    `/config/${meetingId}/current/currentState/plugins/spammessages/questionWeight`
  );

  await incrementTeamsScore(
    meetingId,
    teamId,
    typeof questionWeight === "number" ? questionWeight : 1,
    timestamp
  );
};

// checks if a answer has already been submitted
export const answerAlreadySubmitted = async (
  previousAnswers: Answers,
  submitedAnswer: string
): Promise<boolean> => {
  return (
    // check if each of the previous answer matches submitted
    Object.entries(previousAnswers)
      .map(([_, answer]) => {
        if (
          answer.answer.toLowerCase().trim() ===
          submitedAnswer.toLocaleLowerCase().trim()
        ) {
          return true;
        }
        return false;
      })
      // if no answer matches answer has never been submitted
      .find((answered) => answered) !== undefined
  );
};

/**
 * Saves the answer in the db
 * Increments the team's score
 * Send the team a message
 */
export const saveAnswerAndIncrementScore = async (
  meetingId: string,
  teamId: string,
  teamBotId: string,
  roundName: unknown,
  messageContent: string,
  timestamp: any,
  msgSender: string,
  msgSenderName: string,
  teamMessage: string
) => {
  // store answer in db
  await pushValToDb(
    `data/plugins/spamAnswers/${meetingId}/${roundName}/answers/${teamId}`,
    {
      senderId: msgSender,
      senderName: msgSenderName,
      answer: messageContent,
      timestamp,
      teamId,
    }
  );

  await updateTeamScore(meetingId, timestamp, msgSender);

  await broadcastMessage(meetingId, teamBotId, teamMessage);
};

/**
 * Handles a correct answer submission from a team
 * @param meetingId the zoomsense meeting id
 * @param messageContent the submitted answer
 * @param timestamp the current timestamp
 * @param msgSender the id of the sender of the message
 * @param msgSenderName the name of the sender of the message
 */
export const handleCorrectAnswer = async (
  meetingId: string,
  messageContent: string,
  timestamp: any,
  msgSender: string,
  msgSenderName: string
) => {
  // get team info
  const teamId = await getPlayersTeam(msgSender.toString(), meetingId);
  if (!teamId) return;
  const teamBotId = await getBotForTeam(meetingId, teamId);
  if (!teamBotId) return;

  // get round info
  const roundName = await getValFromDb(
    `/config/${meetingId}/current/currentState/plugins/spammessages/roundName`
  );
  const roundType = await getValFromDb(
    `/config/${meetingId}/current/currentState/plugins/spammessages/roundType`
  );
  if (typeof roundType !== "string") {
    return;
  }

  // handle answer based on round type
  switch (roundType) {
    case "single_answer":
      await correctAnswerSingle(
        meetingId,
        teamId,
        teamBotId,
        roundName,
        messageContent,
        timestamp,
        msgSender,
        msgSenderName
      );
    case "multiple_answer":
      await correctAnswerMultiple(
        meetingId,
        teamId,
        roundName,
        messageContent,
        timestamp,
        msgSender,
        msgSenderName,
        teamBotId
      );
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
export const correctAnswerMultiple = async (
  meetingId: string,
  teamId: string,
  roundName: unknown,
  messageContent: string,
  timestamp: any,
  msgSender: string,
  msgSenderName: string,
  teamBotId: string
) => {
  var previousAnswers = await getValFromDb(
    `data/plugins/spamAnswers/${meetingId}/${roundName}/answers/${teamId}`
  );

  // if team has previously submitted this answer -> let team know
  if (
    isAnswers(previousAnswers) &&
    (await answerAlreadySubmitted(previousAnswers, messageContent))
  ) {
    await broadcastMessage(
      meetingId,
      teamBotId,
      `${messageContent} has already been submitted, please try a different answer`
    );
    return;
  }

  // team hasnt submitted this answer yet -> increment score
  await saveAnswerAndIncrementScore(
    meetingId,
    teamId,
    teamBotId,
    roundName,
    messageContent,
    timestamp,
    msgSender,
    msgSenderName,
    `Well done! ${messageContent} was a correct answer`
  );
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
export const correctAnswerSingle = async (
  meetingId: string,
  teamId: string,
  teamBotId: string,
  roundName: unknown,
  messageContent: string,
  timestamp: any,
  msgSender: string,
  msgSenderName: string
) => {
  // save answer, increment score and let team know
  await saveAnswerAndIncrementScore(
    meetingId,
    teamId,
    teamBotId,
    roundName,
    messageContent,
    timestamp,
    msgSender,
    msgSenderName,
    `Well done! ${messageContent} was the correct answer, we are moving on to the next round`
  );

  // message all other teams  the correct answer
  const botIds = await getAllBots(meetingId);
  botIds.forEach(async (id) => {
    // if is winning team's bot ignore
    if (id === teamBotId) {
      return;
    }
    await broadcastMessage(
      meetingId,
      id,
      `Unfortunately, Team ${teamId} guessed the correct answer (${messageContent}), better luck next time!`
    );
  });

  // move to next round
  await moveToNextRound(meetingId, timestamp);
};
