import { loginCommand, logoutCommand, meCommand } from "./account/index.ts";
import {
  albumCommand,
  artistCommand,
  freshCommand,
  moodCommand,
  searchCommand,
  trackCommand,
} from "./explore/index.ts";
import {
  botCommand,
  helpCommand,
  inviteCommand,
  pingCommand,
  setprefixCommand,
} from "./general/index.ts";
import {
  chartCommand,
  feedCommand,
  nowPlayingCommand,
  recentCommand,
  streakCommand,
  whoCommand,
} from "./listening/index.ts";
import { CommandRegistry, defineCommand } from "./registry.ts";
import {
  loveCommand,
  lovedCommand,
  pinCommand,
  pinsCommand,
  scrobbleCommand,
  unloveCommand,
  unpinCommand,
} from "./scrobbling/index.ts";
import { similarCommand, tasteCommand } from "./social/index.ts";
import {
  monthlyCommand,
  overallCommand,
  playsCommand,
  topalbumsCommand,
  topartistsCommand,
  topCommand,
  toprecordingsCommand,
  toptracksCommand,
  weeklyCommand,
  yearlyCommand,
  yesterdayCommand,
} from "./stats/index.ts";

/**
 * Every command, registered once. The registry drives both the prefix
 * handler and the slash-command registration, so the two stay in sync.
 */
export function buildRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registry.registerAll([
    // General
    helpCommand,
    pingCommand,
    inviteCommand,
    botCommand,
    setprefixCommand,
    // Account
    loginCommand,
    logoutCommand,
    meCommand,
    // Listening
    nowPlayingCommand,
    recentCommand,
    feedCommand,
    whoCommand,
    chartCommand,
    streakCommand,
    // Stats
    topCommand,
    topartistsCommand,
    topalbumsCommand,
    toptracksCommand,
    toprecordingsCommand,
    yesterdayCommand,
    weeklyCommand,
    monthlyCommand,
    yearlyCommand,
    overallCommand,
    playsCommand,
    // Explore
    artistCommand,
    albumCommand,
    trackCommand,
    searchCommand,
    moodCommand,
    freshCommand,
    // Social
    similarCommand,
    tasteCommand,
    // Scrobbling
    scrobbleCommand,
    loveCommand,
    unloveCommand,
    lovedCommand,
    pinCommand,
    unpinCommand,
    pinsCommand,
  ]);
  return registry;
}

export { defineCommand };
