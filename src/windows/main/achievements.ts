import type { AchievementId } from "../../lib/types";

export const ACHIEVEMENTS: Record<
  AchievementId,
  { emoji: string; name: string; desc: string }
> = {
  first_task: {
    emoji: "🌱",
    name: "Primeiro passo",
    desc: "Conclua sua primeira tarefa",
  },
  ten_tasks: {
    emoji: "⚡",
    name: "Mandando bem",
    desc: "Conclua 10 tarefas",
  },
  streak_7: {
    emoji: "🔥",
    name: "Guerreiro da semana",
    desc: "Sequência de 7 dias",
  },
  streak_30: {
    emoji: "🏆",
    name: "Campeão do mês",
    desc: "Sequência de 30 dias",
  },
  first_group: {
    emoji: "🗂️",
    name: "Organizado",
    desc: "Crie seu primeiro grupo",
  },
  level_5: {
    emoji: "🚀",
    name: "Em ascensão",
    desc: "Alcance o nível 5",
  },
};

export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];
