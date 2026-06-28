import { homeDir, join } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  watch,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { deriveGroups, type GroupInfo } from "./groups";
import type { ClientMap } from "./clients";
import type { AchievementId, FocusSession, Task } from "./types";

export type { GroupInfo };
export type { ClientMap };

async function baseDir(): Promise<string> {
  return join(await homeDir(), "FocusBar");
}

async function tasksDir(): Promise<string> {
  return join(await baseDir(), "tasks");
}

export async function ensureDirs(): Promise<void> {
  const dir = await tasksDir();
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadTasks(): Promise<Task[]> {
  await ensureDirs();
  const dir = await tasksDir();
  const entries = await readDir(dir);
  const tasks: Task[] = [];
  for (const entry of entries) {
    if (!entry.isFile || !entry.name.endsWith(".json")) continue;
    try {
      const raw = await readTextFile(await join(dir, entry.name));
      const task = JSON.parse(raw) as Task;
      if (task.id && typeof task.title === "string") tasks.push(task);
    } catch (err) {
      console.warn(`Arquivo de tarefa ilegível, ignorado: ${entry.name}`, err);
    }
  }
  return tasks;
}

export async function saveTask(task: Task): Promise<void> {
  await ensureDirs();
  const path = await join(await tasksDir(), `${task.id}.json`);
  await writeTextFile(path, JSON.stringify(task, null, 2));
}

export async function deleteTask(id: string): Promise<void> {
  const path = await join(await tasksDir(), `${id}.json`);
  if (await exists(path)) await remove(path);
}

export type AchievementState = Partial<Record<AchievementId, string>>;

export async function loadAchievements(): Promise<AchievementState> {
  const path = await join(await baseDir(), "achievements.json");
  try {
    if (!(await exists(path))) return {};
    return JSON.parse(await readTextFile(path)) as AchievementState;
  } catch {
    return {};
  }
}

export async function saveAchievements(state: AchievementState): Promise<void> {
  await ensureDirs();
  const path = await join(await baseDir(), "achievements.json");
  await writeTextFile(path, JSON.stringify(state, null, 2));
}

/** Observa a pasta de tarefas; chama onChange em qualquer alteração. */
export async function watchTasks(onChange: () => void): Promise<() => void> {
  await ensureDirs();
  return watch(await tasksDir(), onChange, { delayMs: 250 });
}

/** Registro append-only de sessões de foco em ~/FocusBar/focus.json */
export async function loadFocusSessions(): Promise<FocusSession[]> {
  const path = await join(await baseDir(), "focus.json");
  try {
    if (!(await exists(path))) return [];
    const parsed = JSON.parse(await readTextFile(path));
    return Array.isArray(parsed) ? (parsed as FocusSession[]) : [];
  } catch {
    return [];
  }
}

export async function appendFocusSession(session: FocusSession): Promise<void> {
  await ensureDirs();
  const sessions = await loadFocusSessions();
  sessions.push(session);
  const path = await join(await baseDir(), "focus.json");
  await writeTextFile(path, JSON.stringify(sessions, null, 2));
}

/** Observa o arquivo de sessões de foco. */
export async function watchFocus(onChange: () => void): Promise<() => void> {
  await ensureDirs();
  const path = await join(await baseDir(), "focus.json");
  if (!(await exists(path))) {
    await writeTextFile(path, "[]");
  }
  return watch(path, onChange, { delayMs: 250 });
}

/** Cores escolhidas pelo usuário por grupo: { "casa": "#FF6363", ... } */
export type GroupColors = Record<string, string>;

export async function loadGroupColors(): Promise<GroupColors> {
  const path = await join(await baseDir(), "groups.json");
  try {
    if (!(await exists(path))) return {};
    return JSON.parse(await readTextFile(path)) as GroupColors;
  } catch {
    return {};
  }
}

export async function saveGroupColors(colors: GroupColors): Promise<void> {
  await ensureDirs();
  const path = await join(await baseDir(), "groups.json");
  await writeTextFile(path, JSON.stringify(colors, null, 2));
}

/** Clientes: grupo → valor mensal em reais, em ~/FocusBar/clients.json */
export async function loadClients(): Promise<ClientMap> {
  const path = await join(await baseDir(), "clients.json");
  try {
    if (!(await exists(path))) return {};
    return JSON.parse(await readTextFile(path)) as ClientMap;
  } catch {
    return {};
  }
}

export async function saveClients(clients: ClientMap): Promise<void> {
  await ensureDirs();
  const path = await join(await baseDir(), "clients.json");
  await writeTextFile(path, JSON.stringify(clients, null, 2));
}

/** Grupos existentes (derivados das tarefas), com cor, ordenados em PT-BR. */
export async function loadGroups(): Promise<GroupInfo[]> {
  const [tasks, colors] = await Promise.all([loadTasks(), loadGroupColors()]);
  return deriveGroups(tasks, colors);
}
