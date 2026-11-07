import { makeRangeCommand } from "./range.tsx";

export const yesterdayCommand = makeRangeCommand(
  "yesterday",
  "yesterday",
  "Top stats from yesterday.",
);
