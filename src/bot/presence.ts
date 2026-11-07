import { ActivityType, type ClientUser, PresenceUpdateStatus } from "discord.js";

type PresenceUser = {
  setPresence: (presence: Parameters<ClientUser["setPresence"]>[0]) => unknown;
};

const ACTIVITIES = [
  { name: "your listening history", type: ActivityType.Listening },
  { name: "the charts update", type: ActivityType.Watching },
  { name: "music detective", type: ActivityType.Playing },
  { name: "your next discovery", type: ActivityType.Listening },
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
