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
  | "level_5"
  | "deep_work"
  | "flow";

export interface FocusSession {
  taskId: string;
  startedAt: string; // ISO 8601 local datetime
  focusedSeconds: number; // actual seconds the timer ran (count-up)
  completed: boolean; // was the task concluded from this session
}

export interface Note {
  id: string;
  title: string;
  body: string; // markdown
  linkedTasks: string[]; // task uuids
  linkedGroups: string[]; // group names
  created: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
