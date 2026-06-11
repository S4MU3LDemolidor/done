export interface Task {
  id: string;
  title: string;
  due: string | null;
  group: string | null;
  done: boolean;
  created: string;
  completedAt: string | null;
  xp: number;
}

export interface ParsedTask {
  title: string;
  due: string | null;
  group: string | null;
}

export type AchievementId =
  | "first_task"
  | "ten_tasks"
  | "streak_7"
  | "streak_30"
  | "first_group"
  | "level_5";
