import { makeRangeCommand } from "./range.tsx";

export const overallCommand = makeRangeCommand("overall", "all_time", "Top stats for all time.", [
  "alltime",
]);
