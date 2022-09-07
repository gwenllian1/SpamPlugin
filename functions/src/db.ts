import { isTeam, isTeams } from "./types/team";

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

export const pluginEnabled = async (meetingId: string) => {
  // get config
  const config = (
    await db
      .ref(`/config/${meetingId}/current/currentState/plugins/spammessages`)
      .get()
  ).val();

  // check enabled
  return config && config.enabled;
};

export const answerCorrect = async (meetingId: string, answer: string) => {
  // find allowable answers
  var answers: string[] = (
    await db
      .ref(
        `/config/${meetingId}/current/currentState/plugins/spammessages/solutions`
      )
      .get()
  ).val();

  // check if submitted answer is correct
  return (
    answers.find((val) => val === answer.toLowerCase().trim()) !== undefined
  );
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
      // find member in this team with the id wer'e looking fo
      const member = teams[teamId].members.find(
        (member) => member.userId === msgSenderId
      );
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

export const moveToNextRound = async (meetingId: string, timestamp: any) => {
  // find current section
  let { currentSection } = (
    await db.ref(`/config/${meetingId}/current`).get()
  ).val();

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
