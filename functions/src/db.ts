import { isTeam, isTeams } from "./types";

const admin = require("firebase-admin");
const db = admin.database();

export const getValFromDb = async (path: string): Promise<unknown> =>
  (await db.ref(path).get()).val();

export const setValInDb = async (path: string, val: unknown): Promise<void> =>
  await db.ref(path).set(val);

export const updateValInDb = async (
  path: string,
  val: Record<string, unknown>
): Promise<void> => await db.ref(path).update(val);

export const pushValToDb = async (
  path: string,
  val: Record<string, unknown>
): Promise<void> => await db.ref(path).push(val);

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
export const scheduleFirebaseUpdate = async (
  meetingId: string,
  timestamp: number,
  path: string,
  value: any
) => {
  const job = { timestamp, meetingId, path, value };
  await db.ref(`zoomSenseSchedule/meeting/${meetingId}/job`).push(job);
};

/**
 * Returns a team id from a player id
 * @param msgSenderId the Id of the player who's team we want to find
 * @param meetingId the meeting id
 * @returns the team's id
 */
export const getPlayersTeam = async (
  msgSenderId: string,
  meetingId: string
): Promise<string | null> => {
  const teams = await getValFromDb(`data/plugins/teamPlugin/${meetingId}`);
  if (!isTeams(teams)) {
    return null;
  }

  const teamId = Object.entries(teams)
    .map(([teamId]) => {
      console.log(teams[teamId]);
      // find member in this team with the id wer'e looking fo
      const member = teams[teamId].members.find(
        (member) => member.userId === msgSenderId
      );
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
export const getBotForTeam = async (
  meetingId: string,
  teamId: string
): Promise<string | null> => {
  const team = await getValFromDb(
    `data/plugins/teamPlugin/${meetingId}/${teamId}`
  );
  if (!isTeam(team)) {
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
export const incrementTeamsScore = async (
  meetingId: string,
  teamId: string,
  scoreIncrement: number,
  timestamp: number
): Promise<void> => {
  await db.ref(`data/plugins/leaderboard/${meetingId}/scoreEvents`).push({
    amount: scoreIncrement,
    teamId,
    timestamp,
  });
};

export const getAllBots = async (meetingId: string): Promise<string[]> => {
  const activeSpeakers = await getValFromDb(`/data/chats/${meetingId}`);

  if (!activeSpeakers || typeof activeSpeakers !== "object") return [];

  return Object.entries(
    (activeSpeakers as Record<string, { isInBO: boolean }>) ?? {}
  )
    .filter(([, { isInBO }]) => isInBO)
    .map(([zoomSensor]) => zoomSensor);
};

// Request that sensor with ID `sensorId` broadcasts the given message
// (i.e. sends it to everyone in the room)
export const broadcastMessage = async (
  meetingId: string,
  sensorId: string,
  content: string
): Promise<void> => {
  await db.ref(`data/chats/${meetingId}/${sensorId}/message`).push({
    msg: content,
    receiver: 0,
  });
};

export const nextRound = async (meetingId: string, timestamp: any) => {
  // move to next round
  let { currentSection } = (
    await db.ref(`/config/${meetingId}/current`).get()
  ).val();
  if (typeof currentSection == "string") {
    currentSection = parseInt(currentSection);
  }

  await scheduleFirebaseUpdate(
    meetingId,
    timestamp,
    `config/${meetingId}/current/currentSection`,
    parseInt(currentSection) + 1
  );
};

export const updateTeamScore = async (
  meetingId: string,
  timestamp: any,
  teamId: string
) => {
  // update score for the team
  var questionWeight: number = (
    await db
      .ref(
        `/config/${meetingId}/current/currentState/plugins/spammessages/questionWeight`
      )
      .get()
  ).val();
  await incrementTeamsScore(meetingId, teamId, questionWeight, timestamp);
};

export const correctAnswerMultiple = async (
  meetingId: string,
  teamId: string,
  roundName: unknown,
  messageContent: string,
  timestamp: any,
  msgSender: string,
  msgSenderName: string
) => {
  const teamBotId = await getBotForTeam(meetingId, teamId);
  if (!teamBotId) return;
  //checking if the answer has been submitted before
  var previousAnswers: string[] = (
    await db
      .ref(
        `data/plugins/spamAnswers/${meetingId}/${roundName}/answers/${teamId}`
      )
      .get()
  ).val();
  console.log("previous answers");
  console.log(previousAnswers);
  //the answer is in the db, check if the team submitted it
  if (previousAnswers) {
    const answered =
      Object.values(previousAnswers).find(
        (val) => val === messageContent.toLowerCase().trim()
      ) !== undefined;
    console.log("answered");
    console.log(answered);
    //if the team has not submitted the answer before, update the database otherwise inform them
    //that the answer is not valid.
    if (!answered) {
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
      await broadcastMessage(
        meetingId,
        teamBotId,
        `Well done! ${messageContent} was a correct answer`
      );
      await updateTeamScore(meetingId, roundName, msgSender);
    } else {
      await broadcastMessage(
        meetingId,
        teamBotId,
        `${messageContent} has already been submitted, please try a different answer`
      );
    }
  } else {
    //if there are no previous answers in the database
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
    await updateTeamScore(meetingId, roundName, msgSender);
    await broadcastMessage(
      meetingId,
      teamBotId,
      `Well done! ${messageContent} was a correct answer`
    );
  }
};

export const correctAnswerSingle = async (
  meetingId: string,
  teamId: string,
  messageContent: string,
  timestamp: any
) => {
  // send chat to this team to tell them they got the correct answer
  const teamBotId = await getBotForTeam(meetingId, teamId);
  if (!teamBotId) return;

  await broadcastMessage(
    meetingId,
    teamBotId,
    `Well done! ${messageContent} was the correct answer, we are moving on to the next round`
  );

  // send message to all other teams telling them the correct answer
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

  await nextRound(meetingId, timestamp);
};
