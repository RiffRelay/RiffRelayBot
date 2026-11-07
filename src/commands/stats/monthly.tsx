import { makeRangeCommand } from "./range.tsx";

export const monthlyCommand = makeRangeCommand(
  "monthly",
  "this_month",
  "Top stats for this month.",
);
