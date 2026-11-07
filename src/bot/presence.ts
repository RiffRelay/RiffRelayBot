import { ActivityType, type ClientUser, PresenceUpdateStatus } from "discord.js";

type PresenceUser = {
  setPresence: (presence: Parameters<ClientUser["setPresence"]>[0]) => unknown;
};

const ACTIVITIES = [
  { name: "your scrobbles", type: ActivityType.Listening },
  { name: "with your listening stats", type: ActivityType.Playing },
  { name: "new scrobbles", type: ActivityType.Watching },
  { name: "music on ListenBrainz", type: ActivityType.Listening },
];

export function startPresenceRotation(user: PresenceUser): ReturnType<typeof setInterval> {
  let index = 0;
  const updatePresence = () => {
    user.setPresence({
      status: PresenceUpdateStatus.DoNotDisturb,
      activities: [ACTIVITIES[index]!],
    });
    index = (index + 1) % ACTIVITIES.length;
  };

  updatePresence();
  const timer = setInterval(updatePresence, 10_000);
  timer.unref();
  return timer;
}
