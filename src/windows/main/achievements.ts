import type { AchievementId } from "../../lib/types";

export const ACHIEVEMENTS: Record<
  AchievementId,
  { name: string; desc: string }
> = {
  first_task: { name: "Primeiro passo", desc: "Conclua sua primeira tarefa" },
  ten_tasks: { name: "Mandando bem", desc: "Conclua 10 tarefas" },
  streak_7: { name: "Guerreiro da semana", desc: "Sequência de 7 dias" },
  streak_30: { name: "Campeão do mês", desc: "Sequência de 30 dias" },
  first_group: { name: "Organizado", desc: "Crie seu primeiro grupo" },
  level_5: { name: "Em ascensão", desc: "Alcance o nível 5" },
  deep_work: { name: "Trabalho profundo", desc: "Uma sessão de foco de 25 min" },
  flow: { name: "Em fluxo", desc: "Foco em 3 dias seguidos" },
};

export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];
